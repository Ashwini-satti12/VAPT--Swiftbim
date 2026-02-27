import type { Vendor } from '../types';

interface Props {
    vendor: Vendor;
}

const CompanyOverview = ({ vendor }: Props) => {
    return (
        <div className="animate-fade-in">

            <div className="grid grid-cols-2 gap-x-12 gap-y-8 max-w-4xl">
                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Number Of Employee</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.num_employees}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Turnover Range</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.turnover_range}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Core Business Area</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.core_business_areas}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">No of People in technical team</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.technical_team_size}
                    </div>
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Description</label>
                    <div className="bg-[#F2F2F2] p-4 rounded-md text-sm text-[#353535] font-gantari h-32 overflow-y-auto">
                        {vendor.description}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyOverview;
