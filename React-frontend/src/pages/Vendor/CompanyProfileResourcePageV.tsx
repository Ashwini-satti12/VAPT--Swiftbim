import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import type { ResourceProfile } from '../TechnicalDirector/PartnerView/types';
import ResourceProfileForm from './components/ResourceProfileForm';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';

function companyProfileBaseFromPath(pathname: string): string {
    if (pathname.includes('/vpm/company-profile')) return '/vpm/company-profile';
    return '/v/company-profile';
}

export default function CompanyProfileResourcePageV() {
    const { resourceId } = useParams<{ resourceId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const companyProfileBase = useMemo(
        () => companyProfileBaseFromPath(location.pathname),
        [location.pathname]
    );

    const [loading, setLoading] = useState(resourceId !== 'new');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [resource, setResource] = useState<ResourceProfile | null>(null);

    useEffect(() => {
        if (resourceId === 'new') {
            setResource(null);
            setLoadError(null);
            setLoading(false);
            return;
        }

        const id = Number(resourceId);
        if (!Number.isFinite(id)) {
            setLoadError('Invalid resource.');
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setLoadError(null);

        api.get<{ profile: Record<string, unknown> | null }>('/api/vendors/profile')
            .then(({ data }) => {
                if (cancelled) return;
                const profiles = (data.profile?.resource_profiles as ResourceProfile[]) ?? [];
                const found = profiles.find((r) => r.id === id);
                if (!found) {
                    setLoadError('Resource profile not found.');
                    setResource(null);
                } else {
                    setResource(found);
                    setLoadError(null);
                }
            })
            .catch(() => {
                if (!cancelled) setLoadError('Failed to load profile.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [resourceId]);

    const goBackToResources = () => {
        navigate(companyProfileBase, { state: { companyProfileTab: 'Resources' } });
    };

    const title =
        resourceId === 'new' ? 'Add New Resource Profile' : 'Edit Resource Profile';

    if (loading) {
        return (
            <div className="flex h-full justify-center bg-white py-24 font-Gantari">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#DD4342]" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-white p-8 font-Gantari">
                <p className="text-center text-[#DD4342]">{loadError}</p>
                <button
                    type="button"
                    onClick={goBackToResources}
                    className="rounded-md bg-[#F2F2F2] px-6 py-2 text-[14px] font-semibold text-[#616161] transition-colors"
                >
                    Back to Company Profile
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white px-2 pt-2 pb-0 font-Gantari">
            <div className="relative mb-6 flex shrink-0 items-center justify-between pb-4 sm:mb-8">
                <div className="group relative inline-flex shrink-0">
                    <button
                        type="button"
                        onClick={goBackToResources}
                        className="cursor-pointer rounded-lg bg-[#F4F4F4] p-2 text-[#1A1A1A]"
                        aria-label="Go back to company profile"
                    >
                        <img src={backIcon} alt="" className="h-5 w-5" aria-hidden />
                    </button>
                    <div className="pointer-events-none absolute left-1/2 top-full z-[100] mt-1 flex -translate-x-1/2 flex-col items-center opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="relative z-20 -mb-[5.5px] h-2.5 w-2.5 rotate-45 border-l border-t border-[#C1C1C1] bg-[#FFFFFF]" />
                        <div className="relative z-10 rounded-md border border-[#C1C1C1] bg-[#FFFFFF] px-2 py-0.5 shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)]">
                            <span className="block whitespace-nowrap text-center font-Gantari text-[14px] font-semibold text-[#353535]">
                                Go Back
                            </span>
                        </div>
                    </div>
                </div>
                <h1 className="min-w-0 flex-1 truncate text-center font-Gantari text-[20px] font-semibold text-[#020202] sm:text-[24px]">
                    {title}
                </h1>
                <div className="w-10 shrink-0" aria-hidden />
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-2">
                <div className="mx-auto max-w-4xl pb-0">
                    <ResourceProfileForm
                        resource={resource}
                        onCancel={goBackToResources}
                        onSuccess={goBackToResources}
                    />
                </div>
            </div>
        </div>
    );
}
