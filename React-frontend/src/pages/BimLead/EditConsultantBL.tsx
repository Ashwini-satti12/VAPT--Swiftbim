import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiChevronDown, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';
import { getPhoneLength } from '../../utils/countryCodes';
import { getPasswordStrengthMessage } from '../../utils/employeeActive';

const PANEL_ROLES = [
    'Management', 'Accounts',
    'Project Manager', 'Technical Director',
    'Client', 'Sales', 'Admin', 'BIM Lead', 'Employee', 'All'
];

const SCROLLBAR_STYLE = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #979797;
    border-radius: 10px;
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #979797 transparent;
  }
`;

interface EmployeeEdit {
    full_name?: string;
    email?: string;
    phone_number?: string;
    user_role?: string;
    department?: string;
    address?: string;
    dob?: string;
    doj?: string;
    user_type?: string;
    salary?: string;
    accountnumber?: string;
    active?: string;
    Allpannel?: string;
}

function CustomDropdown({
    options,
    value,
    onChange,
    placeholder,
}: {
    options: string[];
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2 bg-[#F2F3F4] rounded-[5px] text-[14px] border border-transparent focus:outline-none focus:border-[#AEACAC52] font-Gantari transition-all outline-none cursor-pointer ${isOpen ? '!border-[#AEACAC52]' : ''}`}
            >
                <span className={value ? 'text-[#353535]' : 'text-[#8B8B8B]'}>{value || placeholder}</span>
                <FiChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-slate-500`} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#E0E0E0] rounded-[5px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[100] overflow-hidden">
                    <div className="max-h-[220px] overflow-y-auto">
                        {options.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => { onChange(option); setIsOpen(false); }}
                                className="w-full text-left px-4 py-2.5 text-[14px] text-[#8B8B8B] font-Gantari hover:text-[#353535] hover:bg-[#F4F4F4] transition-colors cursor-pointer"
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EditConsultantBL() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [editError, setEditError] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [roles, setRoles] = useState<string[]>([]);

    useEffect(() => {
        const styleTag = document.createElement("style");
        styleTag.textContent = SCROLLBAR_STYLE;
        document.head.appendChild(styleTag);
        return () => {
            document.head.removeChild(styleTag);
        };
    }, []);
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone_number: '',
        country_code: '+91',
        user_role: 'Consultant',
        address: '',
        dob: '',
        password: '',
        user_type: '',
        doj: '',
        salary: '',
        accountnumber: '',
        profile_picture: null as File | null,
        roles: [] as string[],
        active: 'Active',
    });
    const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+65', '+81'];

    const dobMaxDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    })();

    const parsePhone = (raw: string): { country_code: string; phone_digits: string } => {
        const s = String(raw || '').trim();
        const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.length - a.length);
        for (const code of sortedCodes) {
            if (s.startsWith(code)) {
                return { country_code: code, phone_digits: s.slice(code.length).replace(/\D/g, '') };
            }
        }
        return { country_code: COUNTRY_CODES[0], phone_digits: s.replace(/\D/g, '') };
    };

    useEffect(() => {
        const employeeId = id ? parseInt(id, 10) : NaN;
        if (!employeeId || !Number.isFinite(employeeId)) {
            setLoading(false);
            return;
        }
        api.get<EmployeeEdit>(`/api/employees/${employeeId}`)
            .then(({ data }) => {
                setForm({
                    full_name: data.full_name ?? '',
                    email: data.email ?? '',
                    ...(() => {
                        const parsed = parsePhone(data.phone_number ?? '');
                        return {
                            phone_number: parsed.phone_digits,
                            country_code: parsed.country_code,
                        };
                    })(),
                    user_role: data.user_role ?? 'Consultant',
                    address: data.address ?? '',
                    dob: data.dob ?? '',
                    password: '',
                    user_type: data.user_type ?? '',
                    doj: data.doj ?? '',
                    salary: data.salary ?? '',
                    accountnumber: data.accountnumber ?? '',
                    profile_picture: null,
                    roles: data.Allpannel ? data.Allpannel.split(',').map((r) => r.trim()).filter(Boolean) : [],
                    active: (data.active || '').toLowerCase() === 'active' ? 'Active' : 'Deactivate',
                });
            })
            .catch(() => setEditError('Failed to load consultant.'))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        api.get<{ roles?: string[] }>('/api/employees/roles').then(({ data }) => {
            if (data.roles && Array.isArray(data.roles)) {
                const map = new Map<string, string>();
                data.roles.filter(Boolean).forEach((name) => {
                    const trimmed = name.trim();
                    if (!trimmed) return;
                    const key = trimmed.toLowerCase();
                    if (!map.has(key)) map.set(key, trimmed);
                });
                setRoles(Array.from(map.values()));
            }
        }).catch(() => setRoles([]));
    }, []);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const employeeId = id ? parseInt(id, 10) : NaN;
        if (!employeeId || !Number.isFinite(employeeId)) return;
        setEditError('');

        if (form.dob) {
            if (form.dob > dobMaxDate) {
                setEditError('Date of birth cannot be yesterday or later.');
                return;
            }
        }

        const phoneDigits = String(form.phone_number || '').replace(/\D/g, '');
        if (!form.country_code) {
            setEditError('Please select country code.');
            return;
        }
        const expectedLength = getPhoneLength(form.country_code);
        if (phoneDigits.length !== expectedLength) {
            setEditError(`Phone number must be exactly ${expectedLength} digits for ${form.country_code}.`);
            return;
        }

        if (form.password) {
            const pwdMsg = getPasswordStrengthMessage(form.password);
            if (pwdMsg) {
                setEditError(pwdMsg);
                return;
            }
        }

        setEditSubmitting(true);

        const hasNewFile = !!form.profile_picture;
        if (hasNewFile) {
            const formData = new FormData();
            formData.append('full_name', form.full_name);
            formData.append('email', form.email);
            formData.append('phone_number', `${form.country_code}${phoneDigits}`.replace(/\s+/g, ''));
            if (form.user_role) formData.append('user_role', form.user_role);
            if (form.address) formData.append('address', form.address);
            if (form.dob) formData.append('dob', form.dob);
            formData.append('active', form.active === 'Active' ? 'active' : 'inactive');
            if (form.doj) formData.append('doj', form.doj);
            if (form.salary) formData.append('salary', form.salary);
            if (form.accountnumber) formData.append('accountnumber', form.accountnumber);
            if (form.user_type) formData.append('user_type', form.user_type);
            if (form.roles.length) formData.append('roles', form.roles.join(','));
            if (form.password) formData.append('password', form.password);
            if (form.profile_picture) formData.append('profile_picture', form.profile_picture);

            api.patch(`/api/employees/${employeeId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                .then(() => {
                    toast.success('Updated successfully!');
                    setTimeout(() => navigate('/bl/consultants'), 2000);
                })
                .catch((err) => {
                    const msg = err.response?.data?.message || 'Failed to update.';
                    setEditError(msg);
                    toast.error(msg);
                })
                .finally(() => setEditSubmitting(false));
        } else {
            const payload = {
                full_name: form.full_name,
                email: form.email,
                phone_number: phoneDigits ? `${form.country_code}${phoneDigits}`.replace(/\s+/g, '') : undefined,
                user_role: form.user_role,
                address: form.address || undefined,
                dob: form.dob || undefined,
                doj: form.doj || undefined,
                active: form.active === 'Active' ? 'active' : 'inactive',
                salary: form.salary || undefined,
                accountnumber: form.accountnumber || undefined,
                user_type: form.user_type || undefined,
                Allpannel: form.roles.join(','),
                ...(form.password ? { password: form.password } : {}),
            };
            api.patch(`/api/employees/${employeeId}`, payload)
                .then(() => {
                    toast.success('Updated successfully!');
                    setTimeout(() => navigate('/bl/consultants'), 2000);
                })
                .catch((err) => {
                    const msg = err.response?.data?.message || 'Failed to update.';
                    setEditError(msg);
                    toast.error(msg);
                })
                .finally(() => setEditSubmitting(false));
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E14B4B]" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-5 py-2 bg-white relative custom-scrollbar">
            <div className="max-w-[1174px] mx-auto">
                <div className="flex items-center justify-between mb-8 sm:mb-10 relative">
                    <div className="relative group">
                        <button
                            type="button"
                            onClick={() => navigate('/bl/consultants')}
                            className="p-2 rounded-md bg-[#F2F2F2] flex items-center justify-center text-[#616161] cursor-pointer"
                        >
                            <img src={backIcon} alt="Back" className="w-5 h-5" />
                        </button>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                            <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                            <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-2 py-0.5 relative z-10">
                                <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                    Go back
                                </span>
                            </div>
                        </div>
                    </div>
                    <h3 className="text-[20px] sm:text-[24px] font-medium text-[#000000] font-Gantari text-center flex-1">
                        Edit Consultant Details
                    </h3>
                    <div className="w-10" />
                </div>
                    <form onSubmit={handleSubmit} className="space-y-6 pb-4">
                    {editError && (
                        <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                            <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">!</div>
                            <div className="flex-1">
                                <p className="mt-0.5 text-[13px] leading-snug">{editError}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Full Name</label>
                                <input
                                    type="text"
                                    value={form.full_name}
                                    disabled
                                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Phone Number</label>
                                    <div className="flex items-end gap-3">
                                        <div className="flex-1">
                                            <CustomDropdown
                                                options={COUNTRY_CODES}
                                                value={form.country_code}
                                                onChange={(val) => setForm((f) => ({ ...f, country_code: val }))}
                                                placeholder="Select Code"
                                            />
                                        </div>
                                        <div className="flex-[2]">
                                            <input
                                                type="text"
                                                placeholder="Enter Phone Number"
                                                value={form.phone_number}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        phone_number: e.target.value.replace(/\D/g, '').slice(0, getPhoneLength(f.country_code)),
                                                    }))
                                                }
                                                className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                                            />
                                        </div>
                                    </div>
                                    {form.phone_number && String(form.phone_number).replace(/\D/g, '').length !== getPhoneLength(form.country_code) && (
                                        <p className="text-[12px] text-red-600 mt-2">Phone must be exactly {getPhoneLength(form.country_code)} digits.</p>
                                    )}
                            </div>
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Password</label>
                                <input
                                    type="text"
                                    value="********"
                                    disabled
                                    className="w-full px-4 py-2 text-[14px] text-[#8B8B8B] bg-[#E8E8E8] border border-transparent rounded-[5px] font-Gantari outline-none cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Role</label>
                                <CustomDropdown
                                    options={roles.length ? roles : ['Consultant']}
                                    value={form.user_role}
                                    onChange={(val) => setForm((f) => ({ ...f, user_role: val }))}
                                    placeholder="Select Role"
                                />
                            </div>

                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Account Number</label>
                                <input
                                    type="text"
                                    placeholder="Enter Account Number"
                                    value={form.accountnumber}
                                    onChange={(e) => setForm((f) => ({ ...f, accountnumber: e.target.value }))}
                                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[16px] font-semibold text-[#000000] font-Gantari">Update Profile Picture</label>
                                <div className="flex items-center bg-[#F4F4F4] rounded-[5px] overflow-hidden">
                                    <div className="flex-1 px-4 text-[14px] text-[#979797] truncate py-2">
                                        {form.profile_picture ? form.profile_picture.name : 'Choose file (JPEG or JPG only)'}
                                    </div>
                                    <label className="px-5 py-2 bg-[#E0E0E0] text-[#353535] text-[14px] font-bold cursor-pointer shrink-0 font-Gantari">
                                        Browse File
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".jpg,.jpeg"
                                            onChange={(e) => setForm((f) => ({ ...f, profile_picture: e.target.files ? e.target.files[0] : null }))}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Birth</label>
                                <input
                                    type="date"
                                    value={form.dob}
                                    onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                                        max={dobMaxDate}
                                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                                />
                            </div>
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    disabled
                                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Type</label>
                                <CustomDropdown
                                    options={['Employee', 'Trainee']}
                                    value={form.user_type}
                                    onChange={(val) => setForm((f) => ({ ...f, user_type: val }))}
                                    placeholder="Select Type"
                                />
                            </div>
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Joining</label>
                                <input
                                    type="date"
                                    value={form.doj}
                                    onChange={(e) => setForm((f) => ({ ...f, doj: e.target.value }))}
                                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                                />
                            </div>
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Salary</label>
                                <input
                                    type="text"
                                    placeholder="0000$"
                                    value={form.salary}
                                    onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Address</label>
                        <textarea
                            rows={4}
                            placeholder="Enter Address"
                            value={form.address}
                            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                            className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
                        />
                    </div>

                    <div className="md:col-span-2 bg-[#F9F9F9] p-6 rounded-[10px] border border-[#E0E0E0]">
                        <h4 className="text-[18px] font-bold text-[#000000] mb-6 font-Gantari">Select Panel Access Control</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-6">
                            {PANEL_ROLES.map((role) => (
                                <div
                                    key={role}
                                    className="flex items-center gap-4 cursor-pointer group"
                                    onClick={() => {
                                        const current = form.roles;
                                        if (current.includes(role)) {
                                            setForm((f) => ({ ...f, roles: current.filter((r) => r !== role) }));
                                        } else {
                                            setForm((f) => ({ ...f, roles: [...current, role] }));
                                        }
                                    }}
                                >
                                    <div className={`w-[24px] h-[24px] rounded-[5px] border-2 flex items-center justify-center transition-all ${form.roles.includes(role) ? 'bg-[#D1E6FF] border-[#D1E6FF]' : 'bg-white border-[#D1D1D1] group-hover:border-[#3d3399]'}`}>
                                        {form.roles.includes(role) && (
                                            <svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 5L5 9L13 1" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-[16px] font-medium text-[#353535] group-hover:text-[#000000] font-Gantari">{role}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/bl/consultants')}
                            className="px-6 py-2 sm:py-2 rounded-md bg-[#F2F2F2] text-[#616161] font-medium text-[14px] sm:text-[14px] transition-all cursor-pointer"
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={editSubmitting}
                            className="px-6 py-2 sm:py-2 rounded-md bg-[#DBE9FE]   font-medium text-[14px] sm:text-[14px] transition-all cursor-pointer"
                        >
                            {editSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
