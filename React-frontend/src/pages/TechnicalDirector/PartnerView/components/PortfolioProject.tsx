import type { Vendor, PortfolioProject as PortfolioProjectType } from '../types';
import { FaDownload } from 'react-icons/fa6';
import api from '../../../../lib/api';

interface Props {
    vendor: Vendor;
    editable?: boolean;
    onAdd?: () => void;
    onEdit?: (id: number, data: Partial<PortfolioProjectType>) => void;
    onDelete?: (id: number) => void;
}

const PortfolioProject = ({ vendor, editable, onAdd, onEdit, onDelete }: Props) => {
    const projects: PortfolioProjectType[] = vendor.portfolio_projects || [];

    const truncateFileName = (name: string, maxLen = 20) => {
        const lastDot = name.lastIndexOf('.');
        const ext = lastDot !== -1 ? name.slice(lastDot) : '';
        const base = lastDot !== -1 ? name.slice(0, lastDot) : name;
        return base.length > maxLen ? `${base.slice(0, maxLen)}...${ext}` : name;
    };

    const FileLink = ({ fileName }: { fileName: string | null }) => {
        if (!fileName) return <span className="text-gray-400 text-sm">Not uploaded</span>;
        const fileUrl = `${api.defaults.baseURL}/static/uploads/vendors/${fileName}`;
        return (
            <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Project File</span>
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={fileName}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                    {truncateFileName(fileName)}
                    <FaDownload className="text-gray-600 flex-shrink-0" />
                </a>
            </div>
        );
    };

    if (projects.length === 0) {
        return (
            <div className="animate-fade-in text-gray-500 text-sm py-8 text-center">
                No portfolio projects submitted.
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-10">
            {editable && (
                <div className="flex justify-end">
                    <button
                        onClick={onAdd}
                        className="px-4 py-2 text-sm font-semibold bg-[#DE3D3A] text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        + Add New Project
                    </button>
                </div>
            )}
            {projects.map((proj, index) => (
                <div key={proj.id ?? index} className="border border-gray-200 rounded-lg p-6">
                    <h3 className="font-sora font-semibold text-[#12141D] text-base mb-5">
                        Project {index + 1}
                        {proj.project_name ? ` — ${proj.project_name}` : ''}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Project Name</label>
                            <div className="bg-[#F2F2F2] px-4 py-2 rounded-[5px] text-[14px] text-[#353535] font-Gantari min-h-[44px] flex items-center">
                                {proj.project_name || '—'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Client</label>
                            <div className="bg-[#F2F2F2] px-4 py-2 rounded-[5px] text-[14px] text-[#353535] font-Gantari min-h-[44px] flex items-center">
                                {proj.project_client || '—'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Sector</label>
                            <div className="bg-[#F2F2F2] px-4 py-2 rounded-[5px] text-[14px] text-[#353535] font-Gantari min-h-[44px] flex items-center">
                                {proj.project_sector || '—'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Role</label>
                            <div className="bg-[#F2F2F2] px-4 py-2 rounded-[5px] text-[14px] text-[#353535] font-Gantari min-h-[44px] flex items-center">
                                {proj.project_role || '—'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Tools Used</label>
                            <div className="bg-[#F2F2F2] px-4 py-2 rounded-[5px] text-[14px] text-[#353535] font-Gantari min-h-[44px] flex items-center">
                                {proj.project_tools || '—'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Duration</label>
                            <div className="bg-[#F2F2F2] px-4 py-2 rounded-[5px] text-[14px] text-[#353535] font-Gantari min-h-[44px] flex items-center">
                                {proj.project_duration || '—'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Year</label>
                            <div className="bg-[#F2F2F2] px-4 py-2 rounded-[5px] text-[14px] text-[#353535] font-Gantari min-h-[44px] flex items-center">
                                {proj.project_year || '—'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Project Files</label>
                            <div className="mt-1 space-y-1">
                                {Array.isArray(proj.project_files) && proj.project_files.length > 0
                                    ? proj.project_files.map((f, fi) => <FileLink key={fi} fileName={f} />)
                                    : <FileLink fileName={typeof proj.project_files === 'string' ? proj.project_files : null} />
                                }
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Description</label>
                            <div className="bg-[#F2F2F2] p-4 rounded-[5px] text-[14px] text-[#353535] font-Gantari min-h-[80px] overflow-y-auto">
                                {proj.project_description || '—'}
                            </div>
                        </div>
                    </div>

                    {editable && (
                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                            <button
                                onClick={() => proj.id && onEdit?.(proj.id, proj)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                Edit Project
                            </button>
                            <button
                                onClick={() => proj.id && onDelete?.(proj.id)}
                                className="text-sm font-medium text-red-600 hover:text-red-800"
                            >
                                Remove
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default PortfolioProject;
