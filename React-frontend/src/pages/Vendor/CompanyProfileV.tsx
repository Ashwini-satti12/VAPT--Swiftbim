import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';

type DocType = 'registration' | 'gst' | 'nda' | 'portfolio' | 'general';

type Document = {
    id: number;
    doc_type: string;
    filename: string;
    file_url: string;
    uploaded_at: string;
};

type Portfolio = {
    id?: number;
    project_name?: string;
    project_url?: string;
    description?: string;
};

type Profile = {
    id?: number;
    company_name?: string;
    address?: string;
    gst_number?: string;
    reg_id?: string;
    sectors?: string;
    services?: string;
    keywords?: string;
    portfolio_json?: string;
    contact_name?: string;
    contact_email?: string;
    phone?: string;
    website?: string;
    status?: string;
    portfolio_projects?: Portfolio[];
    documents?: Document[];
};

const SECTOR_OPTIONS = ['Construction', 'Architecture', 'MEP', 'Structural', 'Infrastructure', 'Interior Design', 'Real Estate', 'Smart Buildings', 'Sustainability'];
const SERVICE_OPTIONS = ['BIM Modeling', 'Clash Detection', 'Quantity Surveying', 'Project Management', 'Drafting', 'Rendering', '4D/5D BIM', 'Scan to BIM', 'Consultancy'];
const DOC_TYPES: { value: DocType; label: string }[] = [
    { value: 'registration', label: 'Company Registration' },
    { value: 'gst', label: 'GST Certificate' },
    { value: 'nda', label: 'NDA / Agreement' },
    { value: 'portfolio', label: 'Portfolio Document' },
    { value: 'general', label: 'Other' },
];

function parseList(str?: string): string[] {
    if (!str) return [];
    try { return JSON.parse(str); } catch { return str.split(',').map(s => s.trim()).filter(Boolean); }
}

function stringifyList(arr: string[]): string {
    return JSON.stringify(arr);
}

export default function CompanyProfileV() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<Profile>({});
    const [completeness, setCompleteness] = useState(0);
    const [verified, setVerified] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState<Profile>({});
    const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [kwInput, setKwInput] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [docUploading, setDocUploading] = useState(false);
    const [docType, setDocType] = useState<DocType>('general');
    const [documents, setDocuments] = useState<Document[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        api.get<{ profile: Profile; completeness: number; verified: boolean }>('/api/vendors/profile')
            .then(({ data }) => {
                const p = data.profile || {};
                setProfile(p);
                setCompleteness(data.completeness || 0);
                setVerified(data.verified || false);
                setDocuments(p.documents || []);
                setSelectedSectors(parseList(p.sectors));
                setSelectedServices(parseList(p.services));
                setKeywords(parseList(p.keywords));
                setForm(p);
            })
            .catch(() => { })
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
            setProfile(f => ({
                ...f, ...form,
                sectors: stringifyList(selectedSectors),
                services: stringifyList(selectedServices),
                keywords: stringifyList(keywords),
            }));
            setSuccessMsg('Profile updated successfully!');
            setEditMode(false);
            // Re-fetch completeness
            api.get<{ completeness: number; verified: boolean }>('/api/vendors/profile')
                .then(({ data }) => { setCompleteness(data.completeness); setVerified(data.verified); });
        } catch {
            setErrorMsg('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const toggleChip = (arr: string[], setArr: (a: string[]) => void, val: string) => {
        setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
    };

    const addKeyword = () => {
        const kw = kwInput.trim();
        if (kw && !keywords.includes(kw)) setKeywords([...keywords, kw]);
        setKwInput('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setDocUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('doc_type', docType);
        try {
            const { data } = await api.post<{ success: boolean; id: number; file_url: string }>('/api/vendors/profile/documents', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (data.success) {
                setDocuments(prev => [...prev, { id: data.id, doc_type: docType, filename: file.name, file_url: data.file_url, uploaded_at: new Date().toISOString() }]);
                setSuccessMsg('Document uploaded!');
            }
        } catch { setErrorMsg('Document upload failed.'); }
        finally {
            setDocUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleDeleteDoc = async (docId: number) => {
        try {
            await api.delete(`/api/vendors/profile/documents/${docId}`);
            setDocuments(prev => prev.filter(d => d.id !== docId));
        } catch { setErrorMsg('Failed to delete document.'); }
    };

    if (loading) return (
        <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DE3D3A]" />
        </div>
    );

    const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-gantari text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/20 disabled:bg-[#F8F8F8] disabled:text-[#717171]";

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="shrink-0 mb-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-medium font-gantari text-slate-800">Company Profile</h1>
                        <p className="text-sm text-[#717171] font-gantari mt-0.5">Manage your company details, documents, and visibility</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Verified badge */}
                        <span className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full ${verified ? 'bg-[#E8F9E8] text-[#16A34A]' : 'bg-[#FFF3E0] text-[#E65100]'}`}>
                            <span className={`w-2 h-2 rounded-full ${verified ? 'bg-[#16A34A]' : 'bg-[#E65100]'}`} />
                            {verified ? 'Verified' : 'Unverified'}
                        </span>
                        {editMode ? (
                            <div className="flex gap-2">
                                <button onClick={() => setEditMode(false)} className="px-4 py-2 text-sm font-semibold font-gantari bg-[#F2F2F2] text-[#353535] rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-semibold font-gantari bg-[#DE3D3A] text-white rounded-lg hover:bg-[#c93d3d] transition-colors disabled:opacity-60">
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setEditMode(true)} className="px-4 py-2 text-sm font-semibold font-gantari bg-[#DE3D3A] text-white rounded-lg hover:bg-[#c93d3d] transition-colors">
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {/* Completeness bar */}
                <div className="mt-4 bg-white border border-[#EBEBEB] rounded-xl p-4 flex items-center gap-4">
                    <div className="flex-1">
                        <div className="flex justify-between mb-1.5">
                            <span className="text-sm font-semibold font-gantari text-[#353535]">Profile Completeness</span>
                            <span className="text-sm font-bold text-[#DE3D3A]">{completeness}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-[#F2F2F2] rounded-full overflow-hidden">
                            <div className="h-full bg-[#DE3D3A] rounded-full transition-all duration-700" style={{ width: `${completeness}%` }} />
                        </div>
                    </div>
                    <div className="text-[13px] text-[#717171] font-gantari shrink-0">
                        Complete your profile to get <span className="text-[#353535] font-semibold">more opportunities</span>
                    </div>
                </div>

                {successMsg && <div className="mt-3 p-3 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-xl text-sm font-gantari text-[#14532D] flex items-center gap-2"><span>✅</span>{successMsg}<button onClick={() => setSuccessMsg('')} className="ml-auto text-[#14532D]">✕</button></div>}
                {errorMsg && <div className="mt-3 p-3 bg-[#FFE5E5] border border-[#DE3D3A]/30 rounded-xl text-sm font-gantari text-[#DE3D3A]">{errorMsg}</div>}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pb-4">

                {/* Section: Company Details */}
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
                                    disabled={!editMode}
                                    value={(editMode ? form : profile)[key as keyof Profile] as string || ''}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                    className={inputCls}
                                />
                            </div>
                        ))}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold font-gantari text-[#717171] mb-1">Address</label>
                            <textarea disabled={!editMode} value={(editMode ? form : profile).address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
                        </div>
                    </div>
                </div>

                {/* Section: Sectors & Services */}
                <div className="bg-white border border-[#EBEBEB] rounded-xl p-5">
                    <h2 className="text-base font-bold font-gantari text-[#353535] mb-4">Sectors Served & Services Offered</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs font-semibold font-gantari text-[#717171] mb-2">Sectors</p>
                            <div className="flex flex-wrap gap-2">
                                {SECTOR_OPTIONS.map(s => (
                                    <button key={s} type="button" disabled={!editMode}
                                        onClick={() => editMode && toggleChip(selectedSectors, setSelectedSectors, s)}
                                        className={`px-3 py-1.5 rounded-full text-[12px] font-semibold font-gantari border transition-colors ${selectedSectors.includes(s) ? 'bg-[#DE3D3A] text-white border-[#DE3D3A]' : 'bg-[#F8F8F8] text-[#353535] border-[#E5E5E5]'} ${editMode ? 'cursor-pointer hover:border-[#DE3D3A]' : 'cursor-default'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-semibold font-gantari text-[#717171] mb-2">Services</p>
                            <div className="flex flex-wrap gap-2">
                                {SERVICE_OPTIONS.map(s => (
                                    <button key={s} type="button" disabled={!editMode}
                                        onClick={() => editMode && toggleChip(selectedServices, setSelectedServices, s)}
                                        className={`px-3 py-1.5 rounded-full text-[12px] font-semibold font-gantari border transition-colors ${selectedServices.includes(s) ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'bg-[#F8F8F8] text-[#353535] border-[#E5E5E5]'} ${editMode ? 'cursor-pointer hover:border-[#3B82F6]' : 'cursor-default'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Keywords */}
                <div className="bg-white border border-[#EBEBEB] rounded-xl p-5">
                    <h2 className="text-base font-bold font-gantari text-[#353535] mb-4">Keywords / Skills Tags</h2>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {keywords.map((kw, i) => (
                            <span key={i} className="flex items-center gap-1.5 bg-[#F2F2F2] text-[#353535] text-[12px] font-semibold font-gantari px-3 py-1 rounded-full">
                                {kw}
                                {editMode && <button onClick={() => setKeywords(keywords.filter((_, j) => j !== i))} className="text-[#AEACAC] hover:text-[#DE3D3A] leading-none">×</button>}
                            </span>
                        ))}
                        {keywords.length === 0 && !editMode && <p className="text-sm text-[#AEACAC] font-gantari">No keywords added yet.</p>}
                    </div>
                    {editMode && (
                        <div className="flex gap-2">
                            <input value={kwInput} onChange={e => setKwInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }} placeholder="Type a keyword and press Enter" className={`${inputCls} flex-1`} />
                            <button onClick={addKeyword} className="px-4 py-2 bg-[#353535] text-white text-sm font-semibold font-gantari rounded-lg hover:bg-[#555]">Add</button>
                        </div>
                    )}
                </div>

                {/* Section: Documents */}
                <div className="bg-white border border-[#EBEBEB] rounded-xl p-5">
                    <h2 className="text-base font-bold font-gantari text-[#353535] mb-4">Documents</h2>
                    {/* Upload row */}
                    <div className="flex flex-wrap gap-3 mb-5 items-end">
                        <div>
                            <label className="block text-xs font-semibold font-gantari text-[#717171] mb-1">Document Type</label>
                            <select value={docType} onChange={e => setDocType(e.target.value as DocType)} className={`${inputCls} w-44`}>
                                {DOC_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold font-gantari text-[#717171] mb-1">Upload File</label>
                            <input ref={fileRef} type="file" onChange={handleFileUpload} disabled={docUploading}
                                className="block text-sm font-gantari text-[#353535] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#F2F2F2] file:font-semibold file:font-gantari file:text-[#353535] file:cursor-pointer hover:file:bg-slate-200 disabled:opacity-50" />
                        </div>
                        {docUploading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#DE3D3A]" />}
                    </div>
                    {/* Document list */}
                    {documents.length === 0 ? (
                        <p className="text-sm text-[#AEACAC] font-gantari">No documents uploaded yet.</p>
                    ) : (
                        <div className="divide-y divide-[#F0F0F0]">
                            {documents.map(doc => (
                                <div key={doc.id} className="flex items-center gap-3 py-3">
                                    <div className="w-9 h-9 rounded-lg bg-[#F2F2F2] flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5 text-[#717171]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414A1 1 0 0 1 19 9.414V19a2 2 0 0 1-2 2z" /></svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold font-gantari text-[#353535] truncate">{doc.filename}</p>
                                        <p className="text-xs text-[#717171] font-gantari">{DOC_TYPES.find(d => d.value === doc.doc_type)?.label || doc.doc_type} · {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : ''}</p>
                                    </div>
                                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-[12px] text-[#3B82F6] font-semibold font-gantari hover:underline">View</a>
                                    <button onClick={() => handleDeleteDoc(doc.id)} className="text-[#AEACAC] hover:text-[#DE3D3A] transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
