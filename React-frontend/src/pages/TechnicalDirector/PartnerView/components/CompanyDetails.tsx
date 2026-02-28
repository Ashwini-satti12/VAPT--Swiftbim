import type { Vendor } from '../types';
import { FaDownload } from 'react-icons/fa6';

interface Props {
    vendor: Vendor;
}

const CompanyDetails = ({ vendor }: Props) => {
    const truncateFileName = (name: string, maxLen = 25) => {
        const lastDot = name.lastIndexOf('.');
        const ext = lastDot !== -1 ? name.slice(lastDot) : '';
        const base = lastDot !== -1 ? name.slice(0, lastDot) : name;
        return base.length > maxLen ? `${base.slice(0, maxLen)}...${ext}` : name;
    };

    return (
        <div className="animate-fade-in">

            <div className="grid grid-cols-2 gap-x-12 gap-y-8 max-w-4xl">
                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Company Name</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.company_name}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Country Of Registration</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.country}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Year Of Establishment</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.year_established}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">LinkedIn</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center truncate">
                        {vendor.linkedin}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Website</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center truncate">
                        {vendor.website}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Address</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.address}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Trade License Certificate</label>
                    {vendor.trade_license_file ? (
                        <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg">
                            <a
                                href={`http://localhost:5001/static/uploads/vendors/${vendor.trade_license_file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={vendor.trade_license_file}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                            >
                                {truncateFileName(vendor.trade_license_file)}
                                <FaDownload className="flex-shrink-0" />
                            </a>
                        </div>
                    ) : (
                        <span className="text-gray-400 text-sm">Not uploaded</span>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">GST Certificate</label>
                    {vendor.gst_certificate_file ? (
                        <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg">
                            <a
                                href={`http://localhost:5001/static/uploads/vendors/${vendor.gst_certificate_file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={vendor.gst_certificate_file}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                            >
                                {truncateFileName(vendor.gst_certificate_file)}
                                <FaDownload className="flex-shrink-0" />
                            </a>
                        </div>
                    ) : (
                        <span className="text-gray-400 text-sm">Not uploaded</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompanyDetails;
