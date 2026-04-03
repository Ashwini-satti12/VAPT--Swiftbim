import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronDown } from 'react-icons/fi';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';
import { getPhoneLength } from '../../utils/countryCodes';

const ROLE_OPTIONS: string[] = [];

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
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [form, setForm] = useState({
    full_name: '',
    dob: '',
    phone_number: '',
    country_code: '+91',
    email: '',
    password: '',
    type: '',
    user_role: '',
    joining_date: '',
    department: '',
    address: '',
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
    api.get<{ roles?: string[] }>('/api/employees/roles').then(({ data }) => {
      if (data.roles && Array.isArray(data.roles)) {
        const map = new Map<string, string>();
        data.roles.filter(Boolean).forEach((name) => {
          const trimmed = name.trim();
          if (!trimmed) return;
          const key = trimmed.toLowerCase();
          if (!map.has(key)) map.set(key, trimmed);
        });
        setRoleOptions(Array.from(map.values()));
      }
    }).catch(() => setRoleOptions([]));

    api.get<{ departments?: string[] }>('/api/departments').then(({ data }) => {
      if (data.departments && Array.isArray(data.departments)) {
        const map = new Map<string, string>();
        data.departments.filter(Boolean).forEach((name) => {
          const trimmed = name.trim();
          if (!trimmed) return;
          const key = trimmed.toLowerCase();
          if (!map.has(key)) map.set(key, trimmed);
        });
        setDepartmentOptions(Array.from(map.values()));
      }
    }).catch(() => setDepartmentOptions([]));
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
    if (form.department) formData.append('department', form.department);
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
          navigate('/bl/consultants');
        } else {
          setAddError(data.message || 'Failed to add employee/trainee.');
        }
      })
      .catch((err) => setAddError(err.response?.data?.message || 'Failed to add employee/trainee.'))
      .finally(() => setAddSubmitting(false));
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 bg-white">
      <div className="max-w-[1174px] mx-auto">
        <div className="flex items-center justify-between mb-8 sm:mb-10 relative">
          <button
            type="button"
            onClick={() => navigate('/bl/consultants')}
            className="p-2 rounded-md bg-[#F2F2F2] text-[#616161] transition-all cursor-pointer"
            title="Back"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </button>
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
                  options={roleOptions.length > 0 ? roleOptions : ROLE_OPTIONS}
                  value={form.user_role}
                  onChange={(val) => setForm((f) => ({ ...f, user_role: val }))}
                  placeholder="Select Role"
                />
              </div>
              <div className="relative">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Department <span className="text-[#DD4342]">*</span></label>
                <CustomDropdown
                  options={departmentOptions}
                  value={form.department}
                  onChange={(val) => setForm((f) => ({ ...f, department: val }))}
                  placeholder="Select Department"
                />
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
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Joining <span className="text-[#DD4342]">*</span></label>
                <input
                  type="date"
                  value={form.joining_date}
                  onChange={(e) => setForm((f) => ({ ...f, joining_date: e.target.value }))}
                  className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
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

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8">
            <button
              type="button"
              onClick={() => navigate('/bl/consultants')}
              className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-semibold text-[16px] transition-all font-Gantari min-w-[160px] cursor-pointer"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={addSubmitting}
              className="w-full sm:w-auto px-12 py-2 rounded-md bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] disabled:opacity-50 transition-all font-Gantari min-w-[160px] cursor-pointer disabled:cursor-not-allowed"
            >
              {addSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
