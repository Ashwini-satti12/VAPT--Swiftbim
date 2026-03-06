import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import api from '../../../lib/api';

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
        <div className="bg-white font-inter">
            {/* Toast Notifications Container */}
            <Toaster />

            <div className="flex">
                <div className="flex-1 p-8">
                    {/* Header */}
                    <div className="grid grid-cols-3 items-center mb-8">
                        {/* Left: Back button */}
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center text-gray-600 hover:text-gray-900 font-medium text-lg"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                        >
                            <img src="/src/assets/Vector.svg" alt="Back" className="mr-2 w-5 h-5" />
                            Back
                        </button>

                        {/* Centre: Title */}
                        <h3 className="text-xl md:text-md font-bold font-sora text-[#12141D] text-center whitespace-nowrap">
                            View Partner Details
                        </h3>

                        {/* Right: Empty spacer for flex alignment */}
                        <div className="flex gap-3 justify-end"></div>
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
        </div>
    );
};

export default PartnerView;
