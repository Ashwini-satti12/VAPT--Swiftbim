import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import type { PortfolioProject } from '../../TechnicalDirector/PartnerView/types';

interface Props {
    project: PortfolioProject | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PortfolioModal({ project, onClose, onSuccess }: Props) {
    const [formData, setFormData] = useState<PortfolioProject>({
        project_name: '',
        project_client: '',
        project_sector: '',
        project_description: '',
        project_role: '',
        project_tools: '',
        project_duration: '',
        project_year: '',
        project_files: null
    });
    const [projectFile, setProjectFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (project) {
            setFormData({ ...project });
        }
    }, [project]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setProjectFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    data.append(key, value.toString());
                }
            });
            if (projectFile) {
                data.append('project_file', projectFile);
            }

            if (project?.id) {
                await api.put(`/api/vendors/profile/portfolio-projects/${project.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/api/vendors/profile/portfolio-projects', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save portfolio project');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold font-gantari text-[#353535]">
                        {project ? 'Edit Portfolio Project' : 'Add New Portfolio Project'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Project Name</label>
                            <input
                                name="project_name"
                                value={formData.project_name}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Client</label>
                            <input
                                name="project_client"
                                value={formData.project_client}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Sector</label>
                            <input
                                name="project_sector"
                                value={formData.project_sector}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Role</label>
                            <input
                                name="project_role"
                                value={formData.project_role}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Tools Used</label>
                            <input
                                name="project_tools"
                                value={formData.project_tools}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Duration</label>
                            <input
                                name="project_duration"
                                value={formData.project_duration}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Year</label>
                            <input
                                name="project_year"
                                value={formData.project_year}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Description</label>
                        <textarea
                            name="project_description"
                            value={formData.project_description}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Project Files (Upload)</label>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.jpg,.png"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                        />
                        {formData.project_files && !projectFile && (
                            <div className="text-xs text-blue-600 mt-1">
                                Current file: {typeof formData.project_files === 'string' ? formData.project_files.split('/').pop() : 'Multiple files'}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-[#DE3D3A] text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
