import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import type { ResourceProfile } from '../../TechnicalDirector/PartnerView/types';

interface Props {
    resource: ResourceProfile | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ResourceModal({ resource, onClose, onSuccess }: Props) {
    const [formData, setFormData] = useState<ResourceProfile>({
        name: '',
        designation: '',
        discipline: '',
        years_of_experience: '',
        expertise: '',
        certifications: '',
        software: '',
        role: '',
        projects_worked_on: ''
    });
    const [certFile, setCertFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (resource) {
            setFormData({ ...resource });
        }
    }, [resource]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCertFile(e.target.files[0]);
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
            if (certFile) {
                data.append('certifications_file', certFile);
            }

            // Let axios set multipart boundary (do not set Content-Type — default json header breaks uploads)
            if (resource?.id) {
                await api.put(`/api/vendors/profile/resource-profiles/${resource.id}`, data);
            } else {
                await api.post('/api/vendors/profile/resource-profiles', data);
            }
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save resource profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold font-gantari text-[#353535]">
                        {resource ? 'Edit Resource Profile' : 'Add New Resource Profile'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Name</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                                placeholder="Enter Name"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Designation</label>
                            <input
                                name="designation"
                                value={formData.designation}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                                placeholder="Enter Designation"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Discipline</label>
                            <input
                                name="discipline"
                                value={formData.discipline}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                                placeholder="Enter Discipline"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Years of Experience</label>
                            <input
                                name="years_of_experience"
                                value={formData.years_of_experience}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                                placeholder="Enter Years of Experience"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Role</label>
                            <input
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                                placeholder="Enter Role"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Expertise</label>
                            <input
                                name="expertise"
                                value={formData.expertise}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                                placeholder="Enter Expertise"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Software</label>
                        <input
                            name="software"
                            value={formData.software}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                            placeholder="Enter Software"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Projects Worked On</label>
                        <textarea
                            name="projects_worked_on"
                            value={formData.projects_worked_on}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                            placeholder="Enter Projects Worked On"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Certifications (File)</label>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.jpg,.png"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#DE3D3A] outline-none"
                            placeholder="Upload Certifications File"
                        />
                        {formData.certifications && !certFile && (
                            <div className="text-xs text-blue-600 mt-1">
                                Current file: {formData.certifications.split('/').pop()}
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
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
