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
import type { ResourceProfile, PortfolioProject as PortfolioProjectType } from '../TechnicalDirector/PartnerView/types';
import ResourceModal from './components/ResourceModal';
import PortfolioModal from './components/PortfolioModal';

function parseJsonArray(val: unknown): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    // Handle nested stringified arrays if any (from previous bug)
                    return parsed.map(item => typeof item === 'string' && item.startsWith('[') ? parseJsonArray(item) : item).flat();
                }
            } catch (e) {
                // fall through to split
            }
        }
        return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
}

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
        sectors: parseJsonArray(profile.sectors),
        service_categories: parseJsonArray(profile.service_categories || profile.services),
        other_sector: (profile.other_sector as string) ?? '',
        other_service: (profile.other_service as string) ?? '',
        software_tools: parseJsonArray(profile.software_tools),
        other_software: (profile.other_software as string) ?? '',
        resource_profiles: (profile.resource_profiles as Vendor['resource_profiles']) ?? [],
        portfolio_projects: (profile.portfolio_projects as Vendor['portfolio_projects']) ?? [],
        certifications: parseJsonArray(profile.certifications),
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

    // Resource Modal State
    const [showResourceModal, setShowResourceModal] = useState(false);
    const [editingResource, setEditingResource] = useState<ResourceProfile | null>(null);

    // Portfolio Modal State
    const [showPortfolioModal, setShowPortfolioModal] = useState(false);
    const [editingPortfolio, setEditingPortfolio] = useState<PortfolioProjectType | null>(null);

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

    // JSON fields are handled by handleSave manually to ensure single-level stringification

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
                contact_mobile: draft.contact_mobile,
                phone: draft.phone || draft.contact_mobile || '',
                alternate_contact: draft.alternate_contact,

                num_employees: draft.num_employees,
                turnover_range: draft.turnover_range,
                core_business_areas: draft.core_business_areas,
                technical_team_size: draft.technical_team_size,
                description: draft.description,

                sectors: Array.isArray(draft.sectors) ? JSON.stringify(draft.sectors) : draft.sectors,
                service_categories: Array.isArray(draft.service_categories) ? JSON.stringify(draft.service_categories) : draft.service_categories,
                software_tools: Array.isArray(draft.software_tools) ? JSON.stringify(draft.software_tools) : draft.software_tools,
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
                    <Resources
                        vendor={activeVendor}
                        editable={editMode}
                        onAdd={() => setShowResourceModal(true)}
                        onEdit={(id, data) => { setEditingResource({ ...data, id } as ResourceProfile); setShowResourceModal(true); }}
                        onDelete={async (id) => {
                            if (!window.confirm('Delete this resource profile?')) return;
                            try {
                                await api.delete(`/api/vendors/profile/resource-profiles/${id}`);
                                // refresh
                                const { data } = await api.get('/api/vendors/profile');
                                setVendor(profileToVendor(data.profile));
                            } catch (e) { alert('Delete failed'); }
                        }}
                    />
                );
            case 'Protfolio & Project':
                return (
                    <PortfolioProject
                        vendor={activeVendor}
                        editable={editMode}
                        onAdd={() => setShowPortfolioModal(true)}
                        onEdit={(id, data) => { setEditingPortfolio({ ...data, id } as PortfolioProjectType); setShowPortfolioModal(true); }}
                        onDelete={async (id) => {
                            if (!window.confirm('Delete this project?')) return;
                            try {
                                await api.delete(`/api/vendors/profile/portfolio-projects/${id}`);
                                // refresh
                                const { data } = await api.get('/api/vendors/profile');
                                setVendor(profileToVendor(data.profile));
                            } catch (e) { alert('Delete failed'); }
                        }}
                    />
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
        <div className="h-full bg-white font-Gantari flex flex-col overflow-hidden p-2">
            <div className="flex items-center justify-between mb-10 shrink-0">
                {/* Left: Title */}
                <h3 className="text-[24px] font-semibold font-Gantari text-[#12141D] whitespace-nowrap">
                    Company Profile
                </h3>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-md ${verified ? 'bg-[#E8F9E8] text-[#16A34A]' : 'bg-[#FFF3E0] text-[#E65100]'}`}>
                        <span className={`w-2 h-2 rounded-md ${verified ? 'bg-[#16A34A]' : 'bg-[#E65100]'}`} />
                        {verified ? 'Verified' : 'Unverified'}
                    </span>
                    
                    {!editMode ? (
                        <button
                            onClick={() => { setEditMode(true); setSaveMsg(null); }}
                            className="px-6 py-2 bg-[#DD4342] text-[#F2F2F2] rounded-md transition-all font-bold text-[14px] shadow-sm cursor-pointer shadow-red-100"
                        >
                            Edit Profile
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="px-4 py-2 text-[14px] font-semibold font-Gantari bg-[#F2F2F2] border border-[#AEACAC52] text-[#353535] rounded-md transition-colors disabled:opacity-60 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-[#DD4342] text-[#F2F2F2] rounded-md transition-all font-bold text-[14px] shadow-sm cursor-pointer shadow-red-100 disabled:opacity-60"
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    )}
                </div>
            </div>


                {saveMsg && (
                    <div className={`mt-3 text-sm font-Gantari text-center ${saveMsg.includes('Failed') ? 'text-[#DD4342]' : 'text-green-600'}`}>
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

            {/* TD-style layout: sidebar + content */}
            <div className="flex-1 flex gap-8 min-h-0 overflow-hidden">
                <div className="w-1/4 min-w-[200px] max-w-[240px] flex-shrink-0">
                    <PartnerSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>
                <div className="flex-1 bg-white rounded-lg min-h-0 overflow-y-auto custom-scrollbar pr-2">
                    {renderContent()}
                </div>
            </div>

            {showResourceModal && (
                <ResourceModal
                    onClose={() => { setShowResourceModal(false); setEditingResource(null); }}
                    onSuccess={async () => {
                        const { data } = await api.get('/api/vendors/profile');
                        setVendor(profileToVendor(data.profile));
                        setShowResourceModal(false);
                        setEditingResource(null);
                    }}
                    resource={editingResource}
                />
            )}

            {showPortfolioModal && (
                <PortfolioModal
                    onClose={() => { setShowPortfolioModal(false); setEditingPortfolio(null); }}
                    onSuccess={async () => {
                        const { data } = await api.get('/api/vendors/profile');
                        setVendor(profileToVendor(data.profile));
                        setShowPortfolioModal(false);
                        setEditingPortfolio(null);
                    }}
                    project={editingPortfolio}
                />
            )}
        </div>
    );
}
