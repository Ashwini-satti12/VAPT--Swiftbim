import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiChevronDown, FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import { getPhoneLength, COUNTRY_CODES } from '../../utils/countryCodes';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function openAttachmentInNewTab(file: File) {
  const url = URL.createObjectURL(file);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
}

const ROLE_OPTIONS: string[] = [
  "Bim Lead",
  "Project Manager",
  "Bim Consultant",
  "Technical Director",
  "Bim Coordinator"
];

const PANEL_ACCESS_OPTIONS = [
  'Management', 'Accounts', 'Technical Director', 'Admin', 'Project Manager', 'Client', 'Sales', 'BIM Lead', 'Employee', 'All'
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
        <FiChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-slate-500`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-[#FFFFFF] border border-[#E0E0E0] rounded-[5px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[100] overflow-hidden">
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-[14px] font-Gantari transition-colors cursor-pointer hover:text-[#353535] hover:bg-[#F2F2F2] ${value === option ? 'text-[#353535]' : 'text-[#8B8B8B]'}`}
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

export default function AddConsultantTD() {
  const navigate = useNavigate();
  const [addError, setAddError] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    dob: '',
    phone_number: '',
    email: '',
    password: '',
    type: 'Employee',
    user_role: '',
    joining_date: '',
    address: '',
    roles: ['Employee'],
    profile_picture: null as File | null,
  });
  const [countryCode, setCountryCode] = useState('+91');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const todayISO = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = SCROLLBAR_STYLE;
    document.head.appendChild(styleTag);
    return () => { document.head.removeChild(styleTag); };
  }, []);

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setAddError('Name, email and password are required.');
      return;
    }

    if (form.dob) {
      const today = new Date();
      const dobDate = new Date(form.dob);
      today.setHours(0, 0, 0, 0);
      dobDate.setHours(0, 0, 0, 0);
      if (dobDate > today) {
        setAddError('Date of birth cannot be in the future.');
        return;
      }
    }

    const cleanPhone = form.phone_number.replace(/\D/g, '');
    const expectedLength = getPhoneLength(countryCode);
    if (!cleanPhone || cleanPhone.length !== expectedLength) {
      setAddError(`Phone number must be exactly ${expectedLength} digits for ${countryCode}.`);
      return;
    }

    setAddSubmitting(true);

    const formData = new FormData();
    formData.append('full_name', form.full_name.trim());
    formData.append('email', form.email.trim());
    formData.append('password', form.password);
    if (cleanPhone) formData.append('phone_number', `${countryCode}${cleanPhone}`);
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
          setSuccessMsg('Consultant added successfully!');
          setTimeout(() => {
            setSuccessMsg('');
            navigate('/td/consultants');
          }, 2000);
        } else {
          setAddError(data.message || 'Failed to add employee/trainee.');
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Failed to add consultant.';
        setAddError(msg);
        toast.error(msg);
      })
      .finally(() => setAddSubmitting(false));
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-2 bg-white relative custom-scrollbar">
      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 px-5 py-3 rounded-lg bg-white shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-100 min-w-[300px] animate-in fade-in slide-in-from-top-2 duration-300 font-Gantari">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#58D662]">
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={4}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <span className="text-[16px] font-medium text-[#2D2D2D]">
            {successMsg}
          </span>
        </div>
      )}
      <div className="max-w-[1174px] mx-auto">
        <div className="flex items-center justify-between mb-8 sm:mb-10 relative">
          <button
            type="button"
            onClick={() => navigate('/td/consultants')}
            className="p-2 rounded-md bg-[#F2F2F2] text-[#1A1A1A] transition-all cursor-pointer group relative"
            aria-label="Back"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
                <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">Go Back</span>
              </div>
            </div>
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
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari focus:border-[#AEACAC52] outline-none"
                  >
                    {COUNTRY_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Enter Phone Number"
                    value={form.phone_number}
                    maxLength={getPhoneLength(countryCode)}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, getPhoneLength(countryCode));
                      setForm((f) => ({ ...f, phone_number: digitsOnly }));
                    }}
                    className="flex-1 px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Password <span className="text-[#DD4342]">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter Password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full px-4 py-2 pr-10 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8B8B8B] hover:text-[#595959] focus:outline-none transition-colors border-0 bg-transparent cursor-pointer"
                  >
                    {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
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
                <div className="flex items-center bg-[#F2F3F4] rounded-[5px] overflow-hidden">
                  <div className="flex-1 px-4 text-[14px] text-[#979797] truncate min-w-0 py-2">
                    {form.profile_picture ? "1 file(s) attached" : "Choose file (JPEG or JPG only)"}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg"
                    onChange={(e) => setForm((f) => ({ ...f, profile_picture: e.target.files ? e.target.files[0] : null }))}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2 bg-[#E2E2E2] text-[#8B8B8B] text-[14px] cursor-pointer transition-colors shrink-0 font-Gantari border-0"
                  >
                    Browse File
                  </button>
                </div>
                {form.profile_picture && (
                  <div className="mt-2 flex items-center gap-2 rounded-[5px] bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#101827]">
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-Gantari" title={form.profile_picture.name}>
                        {form.profile_picture.name}
                      </span>
                      <span className="text-xs text-[#8B8B8B]">
                        {formatFileSize(form.profile_picture.size)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <div className="group relative">
                        <button
                          type="button"
                          onClick={() => openAttachmentInNewTab(form.profile_picture!)}
                          className="p-1.5 rounded hover:bg-[#E2E2E2] cursor-pointer"
                          aria-label="View in new tab"
                        >
                          <img src={viewIcon} alt="view" className="h-5 w-5" />
                        </button>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                          <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-1 relative z-10">
                            <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">View</span>
                          </div>
                          <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-b border-r border-[#C1C1C1] rotate-45 relative z-20 -mt-[5.5px]"></div>
                        </div>
                      </div>

                      <div className="group relative">
                        <button
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, profile_picture: null }));
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="p-1.5 rounded hover:bg-[#E2E2E2] cursor-pointer"
                          aria-label="Remove"
                        >
                          <img src={deleteIcon} alt="delete" className="h-5 w-5" />
                        </button>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                          <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-4 py-1 relative z-10">
                            <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">Delete</span>
                          </div>
                          <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-b border-r border-[#C1C1C1] rotate-45 relative z-20 -mt-[5.5px]"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Birth <span className="text-[#DD4342]">*</span></label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                  max={todayISO}
                  className={`w-full px-4 py-2 text-[14px] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52] ${form.dob ? 'text-[#353535]' : 'text-[#8B8B8B]'}`}
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
                  className={`w-full px-4 py-2 text-[14px] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52] ${form.joining_date ? 'text-[#353535]' : 'text-[#8B8B8B]'}`}
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
            <label className="block text-[18px] font-semibold text-[#000000] mb-4 font-Gantari">Select Panel Access Control</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-4 gap-x-6 p-6 bg-[#F2F3F4] rounded-[10px]">
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

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8 ">
            <button
              type="button"
              onClick={() => navigate('/td/consultants')}
              className="w-full sm:w-auto px-6 py-2 rounded-md bg-[#F2F2F2] text-[#616161] font-medium text-[14px] transition-all font-Gantari cursor-pointer"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={addSubmitting}
              className="w-full sm:w-auto px-6 py-2 rounded-md bg-[#DBE9FE] text-[#101827] font-medium text-[14px] disabled:opacity-50 transition-all font-Gantari cursor-pointer"
            >
              {addSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
