import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';
import { getPhoneLength } from '../../utils/countryCodes';

const ROLE_OPTIONS: string[] = [
  "Bim Lead",
  "Project Manager",
  "Bim Consultant",
  "Technical Director",
  "Bim Coordinator"
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

const PANEL_ACCESS_OPTIONS = [
  'Management', 'Accounts', 'Technical Director', 'Admin', 'Project Manager', 'Client', 'Sales', 'BIM Lead', 'Employee', 'All'
];

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
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
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

export default function AddConsultantBL() {
  const navigate = useNavigate();
  const [addError, setAddError] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

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
    dob: '',
    phone_number: '',
    country_code: '+91',
    email: '',
    password: '',
    type: 'Employee',
    user_role: '',
    joining_date: '',
    address: '',
    roles: ['Employee'],
    profile_picture: null as File | null,
  });
  const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+65', '+81'];

  // As requested: cannot select "from yesterday" => allow up to (today - 2 days)
  const dobMaxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  useEffect(() => {
    // Roles and Departments are now localized/removed per requirements
  }, []);

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setAddError('Name, email and password are required.');
      return;
    }

    if (form.dob) {
      if (form.dob > dobMaxDate) {
        setAddError('Date of birth cannot be yesterday or later.');
        return;
      }
    }

    const phoneDigits = String(form.phone_number || '').replace(/\D/g, '');
    if (!form.country_code) {
      setAddError('Please select country code.');
      return;
    }
    const expectedLength = getPhoneLength(form.country_code);
    if (phoneDigits.length !== expectedLength) {
      setAddError(`Phone number must be exactly ${expectedLength} digits for ${form.country_code}.`);
      return;
    }
    setAddSubmitting(true);

    const formData = new FormData();
    formData.append('full_name', form.full_name.trim());
    formData.append('email', form.email.trim());
    formData.append('password', form.password);
    // Store phone as: <country_code><12 digits>
    formData.append(
      'phone_number',
      `${form.country_code}${phoneDigits}`.replace(/\s+/g, ''),
    );
    if (form.user_role) formData.append('user_role', form.user_role);
    if (form.address.trim()) formData.append('address', form.address.trim());
    if (form.dob) formData.append('dob', form.dob);
    if (form.type) formData.append('user_type', form.type);
    if (form.joining_date) formData.append('doj', form.joining_date);
    if (form.roles.length) formData.append('roles', form.roles.join(','));
    formData.append('active', 'active');
    if (form.profile_picture) formData.append('profile_picture', form.profile_picture);

    api
      .post<{ success: boolean; id?: number; message?: string }>(
        '/api/employees',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      .then(({ data }) => {
        if (data.success) {
          toast.success('Consultant added successfully!');
          navigate('/bl/consultants');
        } else {
          const msg = data.message || 'Failed to add employee/trainee.';
          setAddError(msg);
          toast.error(msg);
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Failed to add employee/trainee.';
        setAddError(msg);
        toast.error(msg);
      })
      .finally(() => setAddSubmitting(false));
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-2 bg-white relative custom-scrollbar">
      <div className="max-w-[1174px] mx-auto">
        <div className="flex items-center justify-between mb-8 sm:mb-10 relative">
          <div className="relative group">
            <button
              type="button"
              onClick={() => navigate('/bl/consultants')}
              className="p-2 rounded-md bg-[#F2F2F2] flex items-center justify-center text-[#616161] transition-all cursor-pointer hover:bg-[#E8E8E8]"
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
          <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">
            Add New Consultant
          </h3>
          <div className="w-10" />
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-6">
          {addError && (
            <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">!</div>
              <div className="flex-1">
                <p className="mt-0.5 text-[13px] leading-snug">{addError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            <div className="space-y-5">
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Full Name <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  placeholder="Enter Employee Name"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Phone Number <span className="text-[#DD4342]">*</span>
                </label>
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
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Password <span className="text-[#DD4342]">*</span></label>
                <input
                  type="password"
                  placeholder="Enter Password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div className="relative">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Role <span className="text-[#DD4342]">*</span></label>
                <CustomDropdown
                  options={ROLE_OPTIONS}
                  value={form.user_role}
                  onChange={(val) => setForm((f) => ({ ...f, user_role: val }))}
                  placeholder="Select Role"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[16px] font-semibold text-[#000000] font-Gantari">Upload Profile Picture</label>
                <div className="flex items-center bg-[#F4F4F4] rounded-[5px] overflow-hidden">
                  <div className="flex-1 px-4 text-[14px] text-[#979797] truncate">
                    {form.profile_picture ? form.profile_picture.name : 'Choose file (JPEG or JPG only)'}
                  </div>
                   <label className="px-5 py-2 bg-[#E0E0E0] text-[#353535] text-[14px] font-bold cursor-pointer transition-colors shrink-0 font-Gantari">
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
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Birth <span className="text-[#DD4342]">*</span></label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                  max={dobMaxDate}
                  className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Email ID <span className="text-[#DD4342]">*</span></label>
                <input
                  type="email"
                  placeholder="Enter Email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div className="relative">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Type <span className="text-[#DD4342]">*</span></label>
                <CustomDropdown
                  options={['Employee', 'Trainee']}
                  value={form.type}
                  onChange={(val) => setForm((f) => ({ ...f, type: val }))}
                  placeholder="Select Type"
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Joining <span className="text-[#DD4342]">*</span></label>
                <input
                  type="date"
                  value={form.joining_date}
                  onChange={(e) => setForm((f) => ({ ...f, joining_date: e.target.value }))}
                  className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                />
              </div>
            </div>
          </div>

          <div className="mt-2">
            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Address</label>
            <textarea
              rows={4}
              placeholder="Type your Address..."
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
            />
          </div>

          <div className="mt-8">
            <h4 className="text-[18px] font-bold text-[#000000] mb-6 font-Gantari">Select Panel Access Control</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-4 gap-x-6 p-6 bg-[#F9F9F9] rounded-[10px]">
              {PANEL_ACCESS_OPTIONS.map((role) => (
                <div key={role} className="flex items-center gap-3">
                  <div
                    onClick={() => {
                      const newRoles = form.roles.includes(role)
                        ? form.roles.filter(r => r !== role)
                        : [...form.roles, role];
                      setForm({ ...form, roles: newRoles });
                    }}
                    className={`w-6 h-6 rounded-[4px] border-2 flex items-center justify-center cursor-pointer transition-all ${form.roles.includes(role) ? 'bg-[#D1E6FF] border-[#D1E6FF]' : 'bg-white border-[#E0E0E0]'
                      }`}
                  >
                    {form.roles.includes(role) && (
                      <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                        <path d="M1 5L5 9L13 1" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[14px] font-medium text-[#353535] font-Gantari">{role}</span>
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
              disabled={addSubmitting}
              className="px-6 py-2 sm:py-2 rounded-md bg-[#DBE9FE]   font-medium text-[14px] sm:text-[14px] transition-all cursor-pointer"
            >
              {addSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
        </div>
      </div>
    );
}
