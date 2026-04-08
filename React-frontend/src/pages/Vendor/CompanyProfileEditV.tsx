import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';

type ProfileForm = {
    company_name?: string;
    contact_name?: string;
    contact_email?: string;
    phone?: string;
    website?: string;
    gst_number?: string;
    reg_id?: string;
    address?: string;
    sectors?: string;
    services?: string;
    keywords?: string;
};

function parseList(str?: string): string[] {
    if (!str) return [];
    try {
        return JSON.parse(str);
    } catch {
        return typeof str === 'string' ? str.split(',').map((s) => s.trim()).filter(Boolean) : [];
    }
}

function stringifyList(arr: string[]): string {
    return JSON.stringify(arr);
}

const SECTOR_OPTIONS = ['Construction', 'Architecture', 'MEP', 'Structural', 'Infrastructure', 'Interior Design', 'Real Estate', 'Smart Buildings', 'Sustainability'];
const SERVICE_OPTIONS = ['BIM Modeling', 'Clash Detection', 'Quantity Surveying', 'Project Management', 'Drafting', 'Rendering', '4D/5D BIM', 'Scan to BIM', 'Consultancy'];

export function CompanyProfileEdit({ basePath }: { basePath: string }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<ProfileForm>({});
    const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [kwInput, setKwInput] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        api.get<{ profile: ProfileForm & { sectors?: string; services?: string; keywords?: string } }>('/api/vendors/profile')
            .then(({ data }) => {
                const p = data.profile || {};
                setForm(p);
                setSelectedSectors(parseList((p as { sectors?: string }).sectors));
                setSelectedServices(parseList((p as { services?: string }).services));
                setKeywords(parseList((p as { keywords?: string }).keywords));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setErrorMsg('');
        try {
            await api.put('/api/vendors/profile', {
                ...form,
                sectors: stringifyList(selectedSectors),
                services: stringifyList(selectedServices),
                keywords: stringifyList(keywords),
            });
            setSuccessMsg('Profile updated successfully!');
            setTimeout(() => navigate(`${basePath}/company-profile`), 1500);
        } catch {
            setErrorMsg('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const toggleChip = (arr: string[], setArr: (a: string[]) => void, val: string) => {
        setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
    };

    const addKeyword = () => {
        const kw = kwInput.trim();
        if (kw && !keywords.includes(kw)) setKeywords([...keywords, kw]);
        setKwInput('');
    };

    const inputCls =
        'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-gantari text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/20';

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DE3D3A]" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="shrink-0 mb-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        to={`${basePath}/company-profile`}
                        className="flex items-center text-[#353535] hover:text-[#DE3D3A] font-medium font-gantari"
                    >
                        ← Back to Company Profile
                    </Link>
                    <h1 className="text-xl font-medium font-gantari text-slate-800">Edit Company Profile</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-semibold font-gantari bg-[#DE3D3A] text-white rounded-lg hover:bg-[#c93d3d] disabled:opacity-60"
                >
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>

            {successMsg && (
                <div className="mb-4 p-3 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-xl text-sm font-gantari text-[#14532D]">
                    {successMsg}
                </div>
            )}
            {errorMsg && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">!</div>
                    <div className="flex-1">
                        <p className="mt-0.5 text-[13px] leading-snug">{errorMsg}</p>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-5 pb-4">
                <div className="bg-white border border-[#EBEBEB] rounded-xl p-5">
                    <h2 className="text-base font-bold font-gantari text-[#353535] mb-4">Company Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { label: 'Company Name', key: 'company_name' },
                            { label: 'Contact Name', key: 'contact_name' },
                            { label: 'Contact Email', key: 'contact_email' },
                            { label: 'Phone', key: 'phone' },
                            { label: 'Website', key: 'website' },
                            { label: 'GST Number', key: 'gst_number' },
                            { label: 'Registration ID', key: 'reg_id' },
                        ].map(({ label, key }) => (
                            <div key={key}>
                                <label className="block text-xs font-semibold font-gantari text-[#717171] mb-1">{label}</label>
                                <input
                                    value={form[key as keyof ProfileForm] ?? ''}
                                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                                    className={inputCls}
                                />
                            </div>
                        ))}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold font-gantari text-[#717171] mb-1">Address</label>
                            <textarea
                                value={form.address ?? ''}
                                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                                rows={2}
                                className={`${inputCls} resize-none`}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-[#EBEBEB] rounded-xl p-5">
                    <h2 className="text-base font-bold font-gantari text-[#353535] mb-4">Sectors & Services</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs font-semibold font-gantari text-[#717171] mb-2">Sectors</p>
                            <div className="flex flex-wrap gap-2">
                                {SECTOR_OPTIONS.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => toggleChip(selectedSectors, setSelectedSectors, s)}
                                        className={`px-3 py-1.5 rounded-full text-[12px] font-semibold font-gantari border transition-colors ${
                                            selectedSectors.includes(s) ? 'bg-[#DE3D3A] text-white border-[#DE3D3A]' : 'bg-[#F8F8F8] text-[#353535] border-[#E5E5E5]'
                                        } hover:border-[#DE3D3A]`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-semibold font-gantari text-[#717171] mb-2">Services</p>
                            <div className="flex flex-wrap gap-2">
                                {SERVICE_OPTIONS.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => toggleChip(selectedServices, setSelectedServices, s)}
                                        className={`px-3 py-1.5 rounded-full text-[12px] font-semibold font-gantari border transition-colors ${
                                            selectedServices.includes(s) ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'bg-[#F8F8F8] text-[#353535] border-[#E5E5E5]'
                                        } hover:border-[#3B82F6]`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-[#EBEBEB] rounded-xl p-5">
                    <h2 className="text-base font-bold font-gantari text-[#353535] mb-4">Keywords / Skills Tags</h2>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {keywords.map((kw, i) => (
                            <span key={i} className="flex items-center gap-1.5 bg-[#F2F2F2] text-[#353535] text-[12px] font-semibold font-gantari px-3 py-1 rounded-full">
                                {kw}
                                <button onClick={() => setKeywords(keywords.filter((_, j) => j !== i))} className="text-[#AEACAC] hover:text-[#DE3D3A] leading-none">
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={kwInput}
                            onChange={(e) => setKwInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addKeyword();
                                }
                            }}
                            placeholder="Type a keyword and press Enter"
                            className={`${inputCls} flex-1`}
                        />
                        <button onClick={addKeyword} className="px-4 py-2 bg-[#353535] text-white text-sm font-semibold font-gantari rounded-lg hover:bg-[#555]">
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CompanyProfileEditV() {
    return <CompanyProfileEdit basePath="/v" />;
}
