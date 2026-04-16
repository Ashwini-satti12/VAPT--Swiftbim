import type { Vendor } from '../types';
import { FaDownload } from 'react-icons/fa6';
import {
    sanitizeVendorVendorsFilename,
    vendorVendorsFileUrl,
} from '../../../../lib/vendorUploads';

interface Props {
    vendor: Vendor;
}

const Certificates = ({ vendor }: Props) => {
    const truncateFileName = (name: string, maxLen = 25) => {
        const lastDot = name.lastIndexOf('.');
        const ext = lastDot !== -1 ? name.slice(lastDot) : '';
        const base = lastDot !== -1 ? name.slice(0, lastDot) : name;
        return base.length > maxLen ? `${base.slice(0, maxLen)}...${ext}` : name;
    };

    const FileLink = ({ fileName, label }: { fileName: string, label: string }) => {
        const safe = sanitizeVendorVendorsFilename(fileName) || fileName;
        const fileUrl = vendorVendorsFileUrl(safe);
        return (
            <div className="flex items-center justify-between px-4 py-2 bg-white border border-gray-200 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={fileName}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                    {truncateFileName(fileName)}
                    <FaDownload />
                </a>
            </div>
        );
    };

    const getCertificates = () => {
        if (!vendor.certifications) return [];
        if (Array.isArray(vendor.certifications)) return vendor.certifications;
        try {
            const parsed = JSON.parse(vendor.certifications);
            return Array.isArray(parsed) ? parsed : [vendor.certifications];
        } catch {
            return [vendor.certifications];
        }
    };

    const certs = getCertificates();

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col gap-4 max-w-2xl">

                {/* Quality / ISO Certifications */}
                {certs.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h4 className="text-[16px] font-semibold text-[#12141D] font-Gantari">Quality Certifications</h4>
                        {certs.map((cert: string, index: number) => (
                            <FileLink
                                key={index}
                                fileName={cert}
                                label={`Certificate ${index + 1}`}
                            />
                        ))}
                    </div>
                )}

                {/* Legal Documents */}
                {vendor.nda_agreement_file && (
                    <div className={`flex flex-col gap-3 ${certs.length > 0 ? 'mt-2 border-t pt-4' : ''}`}>
                        <h4 className="text-[16px] font-semibold text-[#12141D] font-Gantari">Legal Documents</h4>
                        <FileLink fileName={vendor.nda_agreement_file} label="NDA Agreement" />
                    </div>
                )}

                {/* Nothing at all */}
                {certs.length === 0 && !vendor.nda_agreement_file && (
                    <div className="text-gray-500">No documents uploaded.</div>
                )}
            </div>
        </div>
    );
};

export default Certificates;
