import type { Vendor } from '../types';

interface Props {
    vendor: Vendor;
    editable?: boolean;
    onChange?: (patch: Partial<Vendor>) => void;
}

const SectorServiceSoftware = ({ vendor, editable = false, onChange }: Props) => {
    const inputClass =
        'w-full bg-white border border-gray-200 p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/30';
    const readonlyClass =
        'bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center';

    const toList = (val: Vendor['sectors'] | Vendor['service_categories'] | Vendor['software_tools']): string[] => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
            const s = val.trim();
            if (!s) return [];
            try {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed)) return parsed;
            } catch {
                // ignore
            }
            return s.split(',').map((x) => x.trim()).filter(Boolean);
        }
        return [];
    };

    const SECTOR_OPTIONS = [
        "Engineering",
        "Real Estate",
        "EPC",
        "Infrastructure",
        "Manufacturing",
        "Energy",
        "Utilities",
        "Other",
    ];

    const SERVICE_OPTIONS = [
        "CAD-Based Services",
        "BIM & Digital Services",
        "Geospatial Services",
        "Software Development",
        "Consulting",
        "Project Management",
        "Other",
    ];

    const SOFTWARE_OPTIONS = [
        "Navisworks",
        "Bexel",
        "ACCA",
        "Revizto",
        "Revit",
        "AutoCAD",
        "Tekla",
        "Civil 3D",
        "MicroStation",
        "Other",
    ];

    const toggle = (current: string[], val: string) =>
        current.includes(val) ? current.filter((x) => x !== val) : [...current, val];

    return (
        <div className="animate-fade-in">

            <div className="flex flex-col gap-8 max-w-4xl">
                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Sectors</label>
                    {editable ? (
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {SECTOR_OPTIONS.map((s) => {
                                    const cur = toList(vendor.sectors);
                                    const active = cur.includes(s);
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => {
                                                const next = toggle(cur, s);
                                                const patch: Partial<Vendor> = { sectors: next };
                                                if (!next.includes('Other')) patch.other_sector = '';
                                                onChange?.(patch);
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold font-gantari border transition-colors ${
                                                active ? 'bg-[#DE3D3A] text-white border-[#DE3D3A]' : 'bg-[#F8F8F8] text-[#353535] border-[#E5E5E5]'
                                            } hover:border-[#DE3D3A]`}
                                        >
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                            {toList(vendor.sectors).includes('Other') && (
                                <input
                                    className={inputClass}
                                    value={vendor.other_sector ?? ''}
                                    onChange={(e) => onChange?.({ other_sector: e.target.value })}
                                    placeholder="Enter other sector"
                                />
                            )}
                            <div className="text-xs text-[#717171] font-gantari">
                                Selected: {toList(vendor.sectors).join(', ') || 'None'}
                            </div>
                        </div>
                    ) : (
                        <div className={readonlyClass}>
                            {(() => {
                                let list = Array.isArray(vendor.sectors)
                                    ? [...vendor.sectors]
                                    : typeof vendor.sectors === 'string'
                                        ? (() => { try { return JSON.parse(vendor.sectors as string); } catch { return [vendor.sectors]; } })()
                                        : [];
                                if (vendor.other_sector) {
                                    list = list.filter((s: string) => s !== 'Other');
                                    list.push(`Other (${vendor.other_sector})`);
                                }
                                return list.join(', ');
                            })()}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Service Categories</label>
                    {editable ? (
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {SERVICE_OPTIONS.map((s) => {
                                    const cur = toList(vendor.service_categories);
                                    const active = cur.includes(s);
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => {
                                                const next = toggle(cur, s);
                                                const patch: Partial<Vendor> = { service_categories: next };
                                                if (!next.includes('Other')) patch.other_service = '';
                                                onChange?.(patch);
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold font-gantari border transition-colors ${
                                                active ? 'bg-[#DE3D3A] text-white border-[#DE3D3A]' : 'bg-[#F8F8F8] text-[#353535] border-[#E5E5E5]'
                                            } hover:border-[#DE3D3A]`}
                                        >
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                            {toList(vendor.service_categories).includes('Other') && (
                                <input
                                    className={inputClass}
                                    value={vendor.other_service ?? ''}
                                    onChange={(e) => onChange?.({ other_service: e.target.value })}
                                    placeholder="Enter other service"
                                />
                            )}
                            <div className="text-xs text-[#717171] font-gantari">
                                Selected: {toList(vendor.service_categories).join(', ') || 'None'}
                            </div>
                        </div>
                    ) : (
                        <div className={readonlyClass}>
                            {(() => {
                                let list = Array.isArray(vendor.service_categories)
                                    ? [...vendor.service_categories]
                                    : typeof vendor.service_categories === 'string'
                                        ? (() => { try { return JSON.parse(vendor.service_categories as string); } catch { return [vendor.service_categories]; } })()
                                        : [];
                                if (vendor.other_service) {
                                    list = list.filter((s: string) => s !== 'Other');
                                    list.push(`Other (${vendor.other_service})`);
                                }
                                return list.join(', ');
                            })()}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Software Tools</label>
                    {editable ? (
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {SOFTWARE_OPTIONS.map((s) => {
                                    const cur = toList(vendor.software_tools);
                                    const active = cur.includes(s);
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => {
                                                const next = toggle(cur, s);
                                                const patch: Partial<Vendor> = { software_tools: next };
                                                if (!next.includes('Other')) patch.other_software = '';
                                                onChange?.(patch);
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold font-gantari border transition-colors ${
                                                active ? 'bg-[#DE3D3A] text-white border-[#DE3D3A]' : 'bg-[#F8F8F8] text-[#353535] border-[#E5E5E5]'
                                            } hover:border-[#DE3D3A]`}
                                        >
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                            {toList(vendor.software_tools).includes('Other') && (
                                <input
                                    className={inputClass}
                                    value={vendor.other_software ?? ''}
                                    onChange={(e) => onChange?.({ other_software: e.target.value })}
                                    placeholder="Enter other software"
                                />
                            )}
                            <div className="text-xs text-[#717171] font-gantari">
                                Selected: {toList(vendor.software_tools).join(', ') || 'None'}
                            </div>
                        </div>
                    ) : (
                        <div className={readonlyClass}>
                            {(() => {
                                let tools = [];
                                try {
                                    const parsed = typeof vendor.software_tools === 'string' ? JSON.parse(vendor.software_tools) : vendor.software_tools;
                                    tools = Array.isArray(parsed) ? parsed : [];
                                } catch {
                                    tools = typeof vendor.software_tools === 'string' ? [vendor.software_tools] : [];
                                }

                                if (vendor.other_software) {
                                    tools = tools.filter((t: string) => t !== 'Other');
                                    tools.push(`Other (${vendor.other_software})`);
                                }

                                return tools.join(', ');
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SectorServiceSoftware;
