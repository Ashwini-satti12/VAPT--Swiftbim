import { useState } from 'react';
import type { Vendor } from '../types';
import { FaDownload } from 'react-icons/fa6';
import { VendorUploadPreviewModal } from '../../../../components/VendorUploadPreviewModal';
import {
    sanitizeVendorVendorsFilename,
    vendorVendorsFileUrl,
} from '../../../../lib/vendorUploads';

interface Props {
    vendor: Vendor;
    editable?: boolean;
    onAdd?: () => void;
    onEdit?: (id: number, data: Partial<Vendor['resource_profiles'][0]>) => void;
    onDelete?: (id: number) => void;
}

const Resources = ({ vendor, editable, onAdd, onEdit, onDelete }: Props) => {
    const [previewFileName, setPreviewFileName] = useState<string | null>(null);
    const profiles = vendor.resource_profiles || [];

    const truncateFileName = (name: string, maxLen = 20) => {
        const lastDot = name.lastIndexOf('.');
        const ext = lastDot !== -1 ? name.slice(lastDot) : '';
        const base = lastDot !== -1 ? name.slice(0, lastDot) : name;
        return base.length > maxLen ? `${base.slice(0, maxLen)}...${ext}` : name;
    };

    const FileLink = ({ fileName, label }: { fileName: string | null; label: string }) => {
        if (!fileName) return null;
        const first = fileName.split(',')[0].trim();
        const safe = sanitizeVendorVendorsFilename(first);
        const fileUrl = safe ? vendorVendorsFileUrl(safe) : '';
        return (
            <div className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg gap-3">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setPreviewFileName(first)}
                        title={first}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium underline underline-offset-2"
                    >
                        {truncateFileName(sanitizeVendorVendorsFilename(first) || first)}
                    </button>
                    {fileUrl ? (
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download"
                            className="p-1.5 text-blue-600 hover:text-blue-800"
                            aria-label="Download file"
                        >
                            <FaDownload className="flex-shrink-0" />
                        </a>
                    ) : null}
                </div>
            </div>
        );
    };

    if (profiles.length === 0) {
        return (
            <>
                <div className="animate-fade-in text-gray-500">
                    No resource profiles available.
                </div>
                {previewFileName && (
                    <VendorUploadPreviewModal
                        fileName={previewFileName}
                        onClose={() => setPreviewFileName(null)}
                    />
                )}
            </>
        );
    }

    return (
        <>
        <div className="animate-fade-in space-y-6">
            {editable && (
                <div className="flex justify-end">
                    <button
                        onClick={onAdd}
                        className="px-4 py-2 text-sm font-semibold bg-[#DE3D3A] text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        + Add New Resource
                    </button>
                </div>
            )}

            {profiles.map((profile, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h4 className="font-bold text-lg text-gray-800 mb-4 border-b pb-2">
                        {profile.name || `Resource #${index + 1}`}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-1">Name</label>
                            <div className="text-[14px] text-[#353535] font-Gantari bg-[#F2F2F2] px-4 py-2 rounded-[5px] min-h-[44px] flex items-center">
                                {profile.name}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-1">Years of experience</label>
                            <div className="text-[14px] text-[#353535] font-Gantari bg-[#F2F2F2] px-4 py-2 rounded-[5px] min-h-[44px] flex items-center">
                                {profile.years_of_experience}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-1">Designation</label>
                            <div className="text-[14px] text-[#353535] font-Gantari bg-[#F2F2F2] px-4 py-2 rounded-[5px] min-h-[44px] flex items-center">
                                {profile.designation}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-1">Discipline</label>
                            <div className="text-[14px] text-[#353535] font-Gantari bg-[#F2F2F2] px-4 py-2 rounded-[5px] min-h-[44px] flex items-center">
                                {profile.discipline}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-1">Role</label>
                            <div className="text-[14px] text-[#353535] font-Gantari bg-[#F2F2F2] px-4 py-2 rounded-[5px] min-h-[44px] flex items-center">
                                {profile.role}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-1">Expertise</label>
                            <div className="text-[14px] text-[#353535] font-Gantari bg-[#F2F2F2] px-4 py-2 rounded-[5px] min-h-[44px] flex items-center">
                                {profile.expertise}
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-1">Software</label>
                            <div className="text-[14px] text-[#353535] font-Gantari bg-[#F2F2F2] px-4 py-2 rounded-[5px] min-h-[44px] flex items-center">
                                {profile.software}
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-1">Projects Worked On</label>
                            <div className="text-[14px] text-[#353535] font-Gantari bg-[#F2F2F2] px-4 py-2 rounded-[5px] min-h-[44px] flex items-center">
                                {profile.projects_worked_on}
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-1">Certificates & Projects</label>
                            {/* The backend might return a path string or JSON array, handling basic string for now based on typical output */}
                            <div className="mt-1">
                                <FileLink fileName={profile.certifications} label="Certificates" />
                            </div>
                        </div>
                    </div>

                    {editable && (
                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                            <button
                                onClick={() => profile.id && onEdit?.(profile.id, profile)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                Edit Details
                            </button>
                            <button
                                onClick={() => profile.id && onDelete?.(profile.id)}
                                className="text-sm font-medium text-red-600 hover:text-red-800"
                            >
                                Remove
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
        {previewFileName && (
            <VendorUploadPreviewModal
                fileName={previewFileName}
                onClose={() => setPreviewFileName(null)}
            />
        )}
        </>
    );
};

export default Resources;
