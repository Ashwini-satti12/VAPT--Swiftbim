import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import type { Vendor } from '../TechnicalDirector/PartnerView/types';
import PartnerSidebar from '../TechnicalDirector/PartnerView/PartnerSidebar';
import CompanyDetails from '../TechnicalDirector/PartnerView/components/CompanyDetails';
import ContactPerson from '../TechnicalDirector/PartnerView/components/ContactPerson';
import CompanyOverview from '../TechnicalDirector/PartnerView/components/CompanyOverview';
import SectorServiceSoftware from '../TechnicalDirector/PartnerView/components/SectorServiceSoftware';
import Resources from '../TechnicalDirector/PartnerView/components/Resources';
import PortfolioProject from '../TechnicalDirector/PartnerView/components/PortfolioProject';
import Certificates from '../TechnicalDirector/PartnerView/components/Certificates';

/** Normalize profile from GET /api/vendors/profile to Vendor shape for shared section components */
function profileToVendor(profile: Record<string, unknown> | null): Vendor | null {
    if (!profile || typeof profile !== 'object') return null;
    return {
        id: (profile.id as number) ?? 0,
        company_name: (profile.company_name as string) ?? '',
        partner_name: profile.partner_name as string | undefined,
        email: profile.email as string | undefined,
        phone: (profile.phone as string) ?? '',
        status: (profile.status as string) ?? 'pending',
        created_at: (profile.created_at as string) ?? '',
        country: (profile.country as string) ?? '',
        state: (profile.state as string) ?? '',
        city: (profile.city as string) ?? '',
        year_established: (profile.year_established as string) ?? '',
        address: (profile.address as string) ?? '',
        website: (profile.website as string) ?? '',
        linkedin: (profile.linkedin as string) ?? '',
        trade_license_file: (profile.trade_license_file as string | null) ?? null,
        gst_certificate_file: (profile.gst_certificate_file as string | null) ?? null,
        nda_agreement_file: (profile.nda_agreement_file as string | null) ?? null,
        contact_name: (profile.contact_name as string) ?? '',
        contact_designation: (profile.contact_designation as string) ?? '',
        contact_email: (profile.contact_email as string) ?? '',
        contact_mobile: (profile.contact_mobile as string) ?? (profile.phone as string) ?? '',
        alternate_contact: (profile.alternate_contact as string) ?? '',
        num_employees: (profile.num_employees as string) ?? '',
        turnover_range: (profile.turnover_range as string) ?? '',
        core_business_areas: (profile.core_business_areas as string) ?? '',
        technical_team_size: (profile.technical_team_size as string) ?? '',
        description: (profile.description as string) ?? '',
        sectors: (profile.sectors as string | string[]) ?? [],
        service_categories: (profile.service_categories as string | string[]) ?? (profile.services as string | string[]) ?? [],
        other_sector: (profile.other_sector as string) ?? '',
        other_service: (profile.other_service as string) ?? '',
        software_tools: (profile.software_tools as string | string[]) ?? [],
        other_software: (profile.other_software as string) ?? '',
        resource_profiles: (profile.resource_profiles as Vendor['resource_profiles']) ?? [],
        portfolio_projects: (profile.portfolio_projects as Vendor['portfolio_projects']) ?? [],
        certifications: (profile.certifications as string | string[]) ?? [],
        billing_currency: (profile.billing_currency as string) ?? '',
        payment_terms: (profile.payment_terms as string) ?? '',
        nda_agreed: (profile.nda_agreed as boolean | number) ?? 0,
        data_protection_compliant: (profile.data_protection_compliant as boolean | number) ?? 0,
    };
}

export default function CompanyProfileV() {
    const [loading, setLoading] = useState(true);
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [, setCompleteness] = useState(0);
    const [verified, setVerified] = useState(false);
    const [activeTab, setActiveTab] = useState('Company Details');
    const [error, setError] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [draft, setDraft] = useState<Vendor | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);

    useEffect(() => {
        api.get<{ profile: Record<string, unknown> | null; completeness: number; verified: boolean }>('/api/vendors/profile')
            .then(({ data }) => {
                const v = profileToVendor(data.profile ?? null);
                setVendor(v);
                setDraft(v ? { ...v } : null);
                setCompleteness(data.completeness ?? 0);
                setVerified(data.verified ?? false);
            })
            .catch(() => setError('Failed to load company profile'))
            .finally(() => setLoading(false));
    }, []);

    const activeVendor = useMemo(() => {
        if (!vendor) return null;
        if (!editMode) return vendor;
        return draft ?? vendor;
    }, [vendor, editMode, draft]);

    const updateDraft = (patch: Partial<Vendor>) => {
        setDraft((d) => {
            const base = d ?? vendor;
            if (!base) return d;
            return { ...base, ...patch };
        });
    };

    const listTextToJson = (val: unknown) => {
        if (val == null) return '';
        const s = String(val).trim();
        if (!s) return '';
        const list = s.split(',').map((x) => x.trim()).filter(Boolean);
        return JSON.stringify(list);
    };

    const handleCancel = () => {
        setDraft(vendor ? { ...vendor } : null);
        setEditMode(false);
        setSaveMsg(null);
    };

    const handleSave = async () => {
        if (!draft) return;
        setSaving(true);
        setSaveMsg(null);
        try {
            await api.put('/api/vendors/profile', {
                company_name: draft.company_name,
                country: draft.country,
                year_established: draft.year_established,
                website: draft.website,
                linkedin: draft.linkedin,
                address: draft.address,

                contact_name: draft.contact_name,
                contact_designation: draft.contact_designation,
                contact_email: draft.contact_email,
                phone: draft.contact_mobile || draft.phone || '',
                alternate_contact: draft.alternate_contact,

                num_employees: draft.num_employees,
                turnover_range: draft.turnover_range,
                core_business_areas: draft.core_business_areas,
                technical_team_size: draft.technical_team_size,
                description: draft.description,

                sectors: listTextToJson(draft.sectors),
                service_categories: listTextToJson(draft.service_categories),
                software_tools: listTextToJson(draft.software_tools),
            });

            // Refresh from backend so UI reflects DB values
            const { data } = await api.get<{ profile: Record<string, unknown> | null; completeness: number; verified: boolean }>('/api/vendors/profile');
            const v = profileToVendor(data.profile ?? null);
            setVendor(v);
            setDraft(v ? { ...v } : null);
            setCompleteness(data.completeness ?? 0);
            setVerified(data.verified ?? false);
            setEditMode(false);
            setSaveMsg('Profile updated successfully.');
        } catch {
            setSaveMsg('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const renderContent = () => {
        if (!activeVendor) return null;
        switch (activeTab) {
            case 'Company Details':
                return <CompanyDetails vendor={activeVendor} editable={editMode} onChange={updateDraft} />;
            case 'Contact Person':
                return <ContactPerson vendor={activeVendor} editable={editMode} onChange={updateDraft} />;
            case 'Company Overview':
                return <CompanyOverview vendor={activeVendor} editable={editMode} onChange={updateDraft} />;
            case 'Sector, Service & Software':
                return <SectorServiceSoftware vendor={activeVendor} editable={editMode} onChange={updateDraft} />;
            case 'Resources':
                return (
                    <div className="space-y-3">
                        {editMode && (
                            <div className="text-xs text-gray-500 font-gantari">
                                Resources editing will be added next (currently view-only).
                            </div>
                        )}
                        <Resources vendor={activeVendor} />
                    </div>
                );
            case 'Protfolio & Project':
                return (
                    <div className="space-y-3">
                        {editMode && (
                            <div className="text-xs text-gray-500 font-gantari">
                                Portfolio editing will be added next (currently view-only).
                            </div>
                        )}
                        <PortfolioProject vendor={activeVendor} />
                    </div>
                );
            case 'Certificates':
                return (
                    <div className="space-y-3">
                        {editMode && (
                            <div className="text-xs text-gray-500 font-gantari">
                                Certificates editing/upload will be added next (currently view-only).
                            </div>
                        )}
                        <Certificates vendor={activeVendor} />
                    </div>
                );
            default:
                return <CompanyDetails vendor={activeVendor} editable={editMode} onChange={updateDraft} />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DE3D3A]" />
            </div>
        );
    }

    if (error || !vendor) {
        return (
            <div className="p-8 text-center">
                <p className="text-[#DE3D3A] font-gantari">{error || 'Company profile not found.'}</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden font-inter">
            {/* Header: title, completeness, verified, Edit Profile */}
            <div className="shrink-0 mb-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-medium font-gantari text-slate-800">Company Profile</h1>
                        <p className="text-sm text-[#717171] font-gantari mt-0.5 mb-6">Manage your company details, documents, and visibility</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full ${verified ? 'bg-[#E8F9E8] text-[#16A34A]' : 'bg-[#FFF3E0] text-[#E65100]'}`}>
                            <span className={`w-2 h-2 rounded-full ${verified ? 'bg-[#16A34A]' : 'bg-[#E65100]'}`} />
                            {verified ? 'Verified' : 'Unverified'}
                        </span>
                        {!editMode ? (
                            <button
                                onClick={() => { setEditMode(true); setSaveMsg(null); }}
                                className="px-4 py-2 text-sm font-semibold font-gantari bg-[#DE3D3A] text-white rounded-lg hover:bg-[#c93d3d] transition-colors"
                            >
                                Edit Profile
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="px-4 py-2 text-sm font-semibold font-gantari bg-white border border-gray-200 text-[#353535] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-4 py-2 text-sm font-semibold font-gantari bg-[#DE3D3A] text-white rounded-lg hover:bg-[#c93d3d] transition-colors disabled:opacity-60"
                                >
                                    {saving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {saveMsg && (
                    <div className={`mt-3 text-sm font-gantari ${saveMsg.includes('Failed') ? 'text-[#DE3D3A]' : 'text-green-600'}`}>
                        {saveMsg}
                    </div>
                )}

                {/* Profile completeness bar */}
                {/* <div className="mt-4 bg-white border border-[#EBEBEB] rounded-xl p-4 flex items-center gap-4">
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
                </div> */}
            </div>

            {/* TD-style layout: sidebar + content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex gap-8 min-h-0">
                <div className="w-1/4 min-w-[180px] flex-shrink-0">
                    <PartnerSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>
                <div className="flex-1 bg-white rounded-lg min-h-[400px]">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
