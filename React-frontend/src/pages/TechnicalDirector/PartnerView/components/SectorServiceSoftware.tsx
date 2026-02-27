import type { Vendor } from '../types';

interface Props {
    vendor: Vendor;
}

const SectorServiceSoftware = ({ vendor }: Props) => {

    return (
        <div className="animate-fade-in">

            <div className="flex flex-col gap-8 max-w-4xl">
                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Sectors</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
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
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Service Categories</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
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
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Software Tools</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {(() => {
                            let tools = [];
                            try {
                                const parsed = typeof vendor.software_tools === 'string' ? JSON.parse(vendor.software_tools) : vendor.software_tools;
                                tools = Array.isArray(parsed) ? parsed : [];
                            } catch {
                                tools = typeof vendor.software_tools === 'string' ? [vendor.software_tools] : [];
                            }

                            if (vendor.other_software) {
                                // Add Other software to list, removing duplicate "Other" literal if present
                                tools = tools.filter((t: string) => t !== 'Other');
                                tools.push(`Other (${vendor.other_software})`);
                            }

                            return tools.join(', ');
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SectorServiceSoftware;
