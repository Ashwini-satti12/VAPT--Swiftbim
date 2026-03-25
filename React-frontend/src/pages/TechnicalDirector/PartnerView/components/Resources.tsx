import type { Vendor } from '../types';
import { FaDownload } from 'react-icons/fa6';

interface Props {
    vendor: Vendor;
}

const Resources = ({ vendor }: Props) => {
    const profiles = vendor.resource_profiles || [];

    if (profiles.length === 0) {
        return (
            <div className="animate-fade-in text-gray-500">
                No resource profiles available.
            </div>
        );
    }

    const truncateFileName = (name: string, maxLen = 20) => {
        const lastDot = name.lastIndexOf('.');
        const ext = lastDot !== -1 ? name.slice(lastDot) : '';
        const base = lastDot !== -1 ? name.slice(0, lastDot) : name;
        return base.length > maxLen ? `${base.slice(0, maxLen)}...${ext}` : name;
    };

    const FileLink = ({ fileName, label }: { fileName: string | null, label: string }) => {
        if (!fileName) return null;
        const fileUrl = `http://localhost:5001/static/uploads/vendors/${fileName}`;
        return (
            <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={fileName}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                    {truncateFileName(fileName)}
                    <FaDownload className="flex-shrink-0" />
                </a>
            </div>
        );
    };

    return (
        <div className="animate-fade-in space-y-8">

            {profiles.map((profile, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h4 className="font-bold text-lg text-gray-800 mb-4 border-b pb-2">
                        {profile.name || `Resource #${index + 1}`}
                    </h4>

                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
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

                        <div className="col-span-2">
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-1">Software</label>
                            <div className="text-[14px] text-[#353535] font-Gantari bg-[#F2F2F2] px-4 py-2 rounded-[5px] min-h-[44px] flex items-center">
                                {profile.software}
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-1">Projects Worked On</label>
                            <div className="text-[14px] text-[#353535] font-Gantari bg-[#F2F2F2] px-4 py-2 rounded-[5px] min-h-[44px] flex items-center">
                                {profile.projects_worked_on}
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-1">Certificates & Projects</label>
                            {/* The backend might return a path string or JSON array, handling basic string for now based on typical output */}
                            <div className="mt-1">
                                <FileLink fileName={profile.certifications} label="Certificates" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Resources;
