import type { Vendor } from '../types';

interface Props {
    vendor: Vendor;
    editable?: boolean;
    onChange?: (patch: Partial<Vendor>) => void;
}

const CompanyOverview = ({ vendor, editable = false, onChange }: Props) => {
    const inputClass =
        'w-full bg-white border border-gray-200 p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/30';
    const readonlyClass =
        'bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center';
    const textareaClass =
        'w-full bg-white border border-gray-200 p-3 rounded-md text-sm text-[#353535] font-gantari focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/30';

    return (
        <div className="animate-fade-in">

            <div className="grid grid-cols-2 gap-x-12 gap-y-8 max-w-4xl">
                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Number Of Employee</label>
                    {editable ? (
                        <input
                            className={inputClass}
                            value={vendor.num_employees ?? ''}
                            onChange={(e) => onChange?.({ num_employees: e.target.value })}
                        />
                    ) : (
                        <div className={readonlyClass}>{vendor.num_employees}</div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Turnover Range</label>
                    {editable ? (
                        <input
                            className={inputClass}
                            value={vendor.turnover_range ?? ''}
                            onChange={(e) => onChange?.({ turnover_range: e.target.value })}
                        />
                    ) : (
                        <div className={readonlyClass}>{vendor.turnover_range}</div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Core Business Area</label>
                    {editable ? (
                        <input
                            className={inputClass}
                            value={vendor.core_business_areas ?? ''}
                            onChange={(e) => onChange?.({ core_business_areas: e.target.value })}
                        />
                    ) : (
                        <div className={readonlyClass}>{vendor.core_business_areas}</div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">No of People in technical team</label>
                    {editable ? (
                        <input
                            className={inputClass}
                            value={vendor.technical_team_size ?? ''}
                            onChange={(e) => onChange?.({ technical_team_size: e.target.value })}
                        />
                    ) : (
                        <div className={readonlyClass}>{vendor.technical_team_size}</div>
                    )}
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Description</label>
                    {editable ? (
                        <textarea
                            className={textareaClass}
                            rows={6}
                            value={vendor.description ?? ''}
                            onChange={(e) => onChange?.({ description: e.target.value })}
                        />
                    ) : (
                        <div className="bg-[#F2F2F2] p-4 rounded-md text-sm text-[#353535] font-gantari h-32 overflow-y-auto">
                            {vendor.description}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompanyOverview;
