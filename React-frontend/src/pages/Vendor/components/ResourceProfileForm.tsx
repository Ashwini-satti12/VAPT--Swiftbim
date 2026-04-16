import { useState, useEffect, useRef } from 'react';
import api from '../../../lib/api';
import type { ResourceProfile } from '../../TechnicalDirector/PartnerView/types';
import { formatFileSize } from '../../TechnicalDirector/MytaskTD';
import viewIcon from '../../../assets/ProjectManager/project/viewIcon.svg';
import deleteIcon from '../../../assets/ProjectManager/project/deleteIcon.svg';

const TD_LABEL =
    'block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari';
const TD_FIELD =
    'w-full px-4 py-2 text-[14px] text-[#353535] placeholder:font-normal placeholder:text-[14px] placeholder:text-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]';

function openLocalFileInNewTab(file: File) {
    const url = URL.createObjectURL(file);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function resolveStoredCertUrl(stored: string): string {
    const t = stored.trim();
    if (!t) return '';
    if (t.startsWith('http://') || t.startsWith('https://')) return t;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/').replace(/\/$/, '');
    const path = t.startsWith('/') ? t : `/${t}`;
    return `${base}${path}`;
}

function displayNameFromStored(stored: string): string {
    const s = stored.trim();
    if (!s) return '';
    try {
        const last = s.split('/').pop() || s;
        return decodeURIComponent(last);
    } catch {
        return s.split('/').pop() || s;
    }
}

const emptyProfile: ResourceProfile = {
    name: '',
    designation: '',
    discipline: '',
    years_of_experience: '',
    expertise: '',
    certifications: '',
    software: '',
    role: '',
    projects_worked_on: '',
};

export interface ResourceProfileFormProps {
    resource: ResourceProfile | null;
    onCancel: () => void;
    onSuccess: () => void;
}

export default function ResourceProfileForm({ resource, onCancel, onSuccess }: ResourceProfileFormProps) {
    const [formData, setFormData] = useState<ResourceProfile>(emptyProfile);
    const [certFile, setCertFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const certInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (resource) {
            setFormData({ ...resource });
        } else {
            setFormData({ ...emptyProfile });
            setCertFile(null);
            if (certInputRef.current) certInputRef.current.value = '';
        }
    }, [resource]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCertFile(e.target.files[0]);
        }
    };

    const openCertPicker = () => {
        certInputRef.current?.click();
    };

    const clearCertFile = () => {
        setCertFile(null);
        if (certInputRef.current) certInputRef.current.value = '';
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

    const hasServerCert = Boolean(formData.certifications?.trim()) && !certFile;
    const attachmentSummaryCount = (certFile ? 1 : 0) + (hasServerCert ? 1 : 0);
    const browseStripText =
        attachmentSummaryCount > 0
            ? `${attachmentSummaryCount} file(s) attached`
            : 'Choose file';

    return (
        <div className="w-full">
            <input
                ref={certInputRef}
                type="file"
                tabIndex={-1}
                className="fixed left-[-9999px] top-0 h-px w-px opacity-0"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.png"
            />
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="mb-1 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">
                            !
                        </div>
                        <div className="flex-1">
                            <p className="text-[13px] leading-snug">{error}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
                    <div>
                        <label className={TD_LABEL}>
                            Name <span className="text-[#DD4342]">*</span>
                        </label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className={TD_FIELD}
                            placeholder="Enter Name"
                        />
                    </div>
                    <div>
                        <label className={TD_LABEL}>
                            Designation <span className="text-[#DD4342]">*</span>
                        </label>
                        <input
                            name="designation"
                            value={formData.designation}
                            onChange={handleChange}
                            required
                            className={TD_FIELD}
                            placeholder="Enter Designation"
                        />
                    </div>
                    <div>
                        <label className={TD_LABEL}>Discipline</label>
                        <input
                            name="discipline"
                            value={formData.discipline}
                            onChange={handleChange}
                            className={TD_FIELD}
                            placeholder="Enter Discipline"
                        />
                    </div>
                    <div>
                        <label className={TD_LABEL}>Years of Experience</label>
                        <input
                            name="years_of_experience"
                            value={formData.years_of_experience}
                            onChange={handleChange}
                            className={TD_FIELD}
                            placeholder="Enter Years of Experience"
                        />
                    </div>
                    <div>
                        <label className={TD_LABEL}>Role</label>
                        <input
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className={TD_FIELD}
                            placeholder="Enter Role"
                        />
                    </div>
                    <div>
                        <label className={TD_LABEL}>Expertise</label>
                        <input
                            name="expertise"
                            value={formData.expertise}
                            onChange={handleChange}
                            className={TD_FIELD}
                            placeholder="Enter Expertise"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className={TD_LABEL}>Software</label>
                        <input
                            name="software"
                            value={formData.software}
                            onChange={handleChange}
                            className={TD_FIELD}
                            placeholder="Enter Software"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className={TD_LABEL}>Projects Worked On</label>
                        <textarea
                            name="projects_worked_on"
                            value={formData.projects_worked_on}
                            onChange={handleChange}
                            rows={4}
                            className={`${TD_FIELD} resize-none`}
                            placeholder="Enter Projects Worked On"
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <span className="mb-2 block text-[16px] font-semibold text-[#000000] font-Gantari">
                            Certifications (file)
                        </span>
                        <div className="flex items-center overflow-hidden rounded-[5px] bg-[#F2F3F4]">
                            <div className="min-w-0 flex-1 truncate px-4 py-2 text-[14px] text-[#979797]">
                                {browseStripText}
                            </div>
                            <button
                                type="button"
                                onClick={(ev) => {
                                    ev.stopPropagation();
                                    openCertPicker();
                                }}
                                className="shrink-0 cursor-pointer border-0 bg-[#E2E2E2] px-5 py-2 text-[14px] text-[#8B8B8B] transition-colors font-Gantari"
                            >
                                Browse File
                            </button>
                        </div>

                        {attachmentSummaryCount > 0 && (
                            <div className="flex flex-col gap-2">
                                {hasServerCert && (
                                    <div className="flex items-center gap-2 rounded-[5px] bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#101827]">
                                        <div className="min-w-0 flex-1">
                                            <span
                                                className="block truncate font-Gantari"
                                                title={displayNameFromStored(formData.certifications)}
                                            >
                                                {displayNameFromStored(formData.certifications)}
                                            </span>
                                            <span className="text-xs text-[#8B8B8B]">Saved on profile</span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const u = resolveStoredCertUrl(formData.certifications);
                                                    if (u) window.open(u, '_blank', 'noopener,noreferrer');
                                                }}
                                                className="cursor-pointer rounded p-1.5 hover:bg-[#E2E2E2]"
                                                title="View in new tab"
                                                aria-label={`View ${displayNameFromStored(formData.certifications)} in new tab`}
                                            >
                                                <img src={viewIcon} alt="" className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {certFile && (
                                    <div className="flex items-center gap-2 rounded-[5px] bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#101827]">
                                        <div className="min-w-0 flex-1">
                                            <span className="block truncate font-Gantari" title={certFile.name}>
                                                {certFile.name}
                                            </span>
                                            <span className="text-xs text-[#8B8B8B]">
                                                {formatFileSize(certFile.size)}
                                            </span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => openLocalFileInNewTab(certFile)}
                                                className="cursor-pointer rounded p-1.5 hover:bg-[#E2E2E2]"
                                                title="View in new tab"
                                                aria-label={`View ${certFile.name} in new tab`}
                                            >
                                                <img src={viewIcon} alt="" className="h-5 w-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearCertFile}
                                                className="cursor-pointer rounded p-1.5 hover:bg-[#E2E2E2]"
                                                title="Remove"
                                                aria-label={`Remove ${certFile.name}`}
                                            >
                                                <img src={deleteIcon} alt="" className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col justify-center gap-4 pb-0 pt-2 sm:flex-row sm:gap-6 sm:pt-8">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full cursor-pointer rounded-md bg-[#F2F2F2] px-6 py-2 text-[14px] font-semibold text-[#353535] font-Gantari sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full cursor-pointer rounded-md bg-[#DD4342] px-6 py-2 text-[14px] font-semibold text-white font-Gantari disabled:opacity-50 sm:w-auto"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </form>
        </div>
    );
}
