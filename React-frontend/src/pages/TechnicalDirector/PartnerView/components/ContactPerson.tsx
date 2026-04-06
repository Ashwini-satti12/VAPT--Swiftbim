import type { Vendor } from '../types';

interface Props {
    vendor: Vendor;
    editable?: boolean;
    onChange?: (patch: Partial<Vendor>) => void;
}

const ContactPerson = ({ vendor, editable = false, onChange }: Props) => {
    const inputClass =
        'w-full bg-[#F2F2F2] border-none px-4 py-2 rounded-[5px] text-[14px] text-[#353535] font-Gantari min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/30 placeholder:text-[#8B8B8B] placeholder:text-[14px]';
    const readonlyClass =
        'bg-[#F2F2F2] px-4 py-2 rounded-[5px] text-[14px] text-[#353535] font-Gantari min-h-[44px] flex items-center';

    return (
        <div className="animate-fade-in">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl">
                <div>
                    <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Name</label>
                    {editable ? (
                        <input
                            className={inputClass}
                            value={vendor.contact_name ?? ''}
                            onChange={(e) => onChange?.({ contact_name: e.target.value })}
                        />
                    ) : (
                        <div className={readonlyClass}>{vendor.contact_name}</div>
                    )}
                </div>

                <div>
                    <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Designation</label>
                    {editable ? (
                        <input
                            className={inputClass}
                            value={vendor.contact_designation ?? ''}
                            onChange={(e) => onChange?.({ contact_designation: e.target.value })}
                        />
                    ) : (
                        <div className={readonlyClass}>{vendor.contact_designation}</div>
                    )}
                </div>

                <div>
                    <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Email</label>
                    {editable ? (
                        <input
                            className={inputClass}
                            value={vendor.contact_email ?? ''}
                            onChange={(e) => onChange?.({ contact_email: e.target.value })}
                        />
                    ) : (
                        <div className={readonlyClass}>{vendor.contact_email}</div>
                    )}
                </div>

                <div>
                    <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Phone Number</label>
                    {editable ? (
                        <input
                            className={inputClass}
                            value={vendor.contact_mobile ?? ''}
                            onChange={(e) => onChange?.({ contact_mobile: e.target.value })}
                        />
                    ) : (
                        <div className={readonlyClass}>{vendor.contact_mobile}</div>
                    )}
                </div>

                <div>
                    <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">Alternate Phone Number</label>
                    {editable ? (
                        <input
                            className={inputClass}
                            value={vendor.alternate_contact ?? ''}
                            onChange={(e) => onChange?.({ alternate_contact: e.target.value })}
                        />
                    ) : (
                        <div className={readonlyClass}>{vendor.alternate_contact}</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactPerson;
