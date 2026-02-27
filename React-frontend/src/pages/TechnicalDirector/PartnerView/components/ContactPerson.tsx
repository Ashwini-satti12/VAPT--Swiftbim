import type { Vendor } from '../types';

interface Props {
    vendor: Vendor;
}

const ContactPerson = ({ vendor }: Props) => {
    return (
        <div className="animate-fade-in">

            <div className="grid grid-cols-2 gap-x-12 gap-y-8 max-w-4xl">
                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Name</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.contact_name}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Designation</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.contact_designation}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Email</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.contact_email}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Phone Number</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.contact_mobile}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold font-gantari text-[#12141D] mb-2">Alternate Phone Number</label>
                    <div className="bg-[#F2F2F2] p-3 rounded-md text-sm text-[#353535] font-gantari min-h-[44px] flex items-center">
                        {vendor.alternate_contact}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPerson;
