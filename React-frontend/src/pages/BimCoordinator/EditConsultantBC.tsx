import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiChevronDown, FiCheck } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';
import { COUNTRY_CODES, getPhoneLength } from '../../utils/countryCodes';

const SCROLLBAR_STYLE = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #88888840;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #88888860;
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
        <FiChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-slate-500`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#E0E0E0] rounded-[5px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[100] overflow-hidden">
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
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

export default function EditConsultantBC() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    user_role: '',
    department: '',
    address: '',
    dob: '',
    password: '',
    user_type: '',
    doj: '',
    salary: '',
    accountnumber: '',
    profile_picture: null as File | null,
    active: 'Active',
    roles: [] as string[],
  });
  const [countryCode, setCountryCode] = useState('+91');

  const normalizeSpaces = (val: string) => {
    return val.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
  };

  const PANEL_ROLES = [
      'Management', 'Accounts',
      'Project Manager', 'Technical Director',
      'Client', 'Sales', 'Admin', 'BIM Lead', 'Employee', 'All'
  ];

  // Filter roles based on user's permissions
  const getAllowedRoles = (currentRoles: string[]): string[] => {
    const userRole = user?.user_role || '';
    const restrictedRoles: string[] = [];
    
    if (userRole === 'BIM Coordinator') {
        restrictedRoles.push('CEO', 'CTO', 'Technical Director', 'Project Manager', 'BIM Lead');
    } else if (userRole === 'BIM Lead') {
        restrictedRoles.push('CEO', 'CTO', 'Technical Director', 'Project Manager');
    } else if (userRole === 'Project Manager') {
        restrictedRoles.push('CEO', 'CTO', 'Technical Director', 'BIM Lead');
    }
    
    return currentRoles.filter(role => !restrictedRoles.includes(role));
  };

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = SCROLLBAR_STYLE;
    document.head.appendChild(styleTag);
    return () => { document.head.removeChild(styleTag); };
  }, []);

  useEffect(() => {
    // Fetch roles
    api.get<{ roles?: string[] }>('/api/employees/roles')
        .then(({ data }) => setRoles(data.roles || []))
        .catch((error) => console.error('Error fetching roles:', error));

    // Fetch departments
    api.get<{ departments?: string[] }>('/api/departments')
        .then(({ data }) => setDepartmentOptions(data.departments || []))
        .catch((error) => console.error('Error fetching departments:', error));

    // Fetch consultant data
    if (id) {
      api.get<{ employees?: any[] }>('/api/employees')
        .then(({ data }) => {
          const emp = data.employees?.find((e: any) => e.id === Number(id));
          if (emp) {
            let phone = emp.phone_number || '';
            let code = '+91';
            for (const c of COUNTRY_CODES) {
              if (phone.startsWith(c)) {
                code = c;
                phone = phone.replace(c, '');
                break;
              }
            }
            setCountryCode(code);
            setForm({
              full_name: emp.full_name || '',
              email: emp.email || '',
              phone_number: phone,
              user_role: emp.user_role || '',
              department: emp.department || '',
              address: emp.address || '',
              dob: emp.dob || '',
              password: '', // Don't show password
              user_type: emp.user_type || '',
              doj: emp.doj || '',
              salary: emp.salary || '',
              accountnumber: emp.accountnumber || '',
              profile_picture: null,
              active: emp.active === 'active' ? 'Active' : 'Deactivate',
              roles: emp.Allpannel ? emp.Allpannel.split(',').map((r: string) => r.trim()) : [],
            });
          }
        })
        .catch((err) => console.error('Error fetching employee:', err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setEditError('');
    setEditSubmitting(true);

    const cleanPhone = form.phone_number.replace(/\D/g, '');

    // Additional Validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setEditError('Please enter a valid email address.');
      setEditSubmitting(false);
      return;
    }

    const expectedLength = getPhoneLength(countryCode);
    if (cleanPhone && cleanPhone.length !== expectedLength) {
      setEditError(`Phone number must be exactly ${expectedLength} digits for ${countryCode}.`);
      setEditSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('full_name', form.full_name.trim());
    formData.append('email', form.email.trim());
    if (form.password) formData.append('password', form.password);
    if (cleanPhone) formData.append('phone_number', `${countryCode}${cleanPhone}`);
    if (form.user_role) formData.append('user_role', form.user_role);
    if (form.address.trim()) formData.append('address', form.address.trim());
    if (form.dob) formData.append('dob', form.dob);
    if (form.user_type) formData.append('user_type', form.user_type);
    if (form.doj) formData.append('doj', form.doj);
    if (form.department) formData.append('department', form.department);
    if (form.salary) formData.append('salary', form.salary);
    if (form.accountnumber) formData.append('accountnumber', form.accountnumber);
    formData.append('active', form.active === 'Active' ? 'active' : 'inactive');
    if (form.roles.length) formData.append('roles', form.roles.join(','));
    if (form.profile_picture) {
        formData.append('profile_picture', form.profile_picture);
    }

    api.patch(`/api/employees/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
      .then(({ data }) => {
        if (data.success) {
          setEditSuccess(true);
          setTimeout(() => navigate('/bc/consultants'), 2000);
        } else {
          setEditError(data.message || 'Failed to update consultant.');
        }
      })
      .catch((err) => setEditError(err.response?.data?.message || 'Failed to update consultant.'))
      .finally(() => setEditSubmitting(false));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 bg-white min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
      </div>
    );
  }

  const allowedRolesList = getAllowedRoles(roles);
  // Ensure the current role is in the list even if it's normally restricted
  if (form.user_role && !allowedRolesList.includes(form.user_role)) {
    allowedRolesList.push(form.user_role);
  }

  return (
    <div className="h-screen overflow-y-auto bg-white custom-scrollbar">
      <div className="max-w-[1174px] mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-8 sm:mb-10 relative">
          <button
            type="button"
            onClick={() => navigate('/bc/consultants')}
            className="group relative p-2 rounded-md bg-[#F2F2F2] text-[#616161] transition-all cursor-pointer"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
              <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
              <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                  Go Back
                </span>
              </div>
            </div>
          </button>
          <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">
            Edit Consultant Details
          </h3>
          <div className="w-10" />
        </div>

        <form onSubmit={handleEditSubmit} className="space-y-6">
          {editError && (
            <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">!</div>
              <div className="flex-1">
                <p className="mt-0.5 text-[13px] leading-snug">{editError}</p>
              </div>
            </div>
          )}
          {editSuccess && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
              <div className="bg-white rounded-[15px] p-8 max-w-[350px] w-full text-center shadow-2xl scale-100">
                <div className="w-16 h-16 bg-[#E8F5E9] text-[#2E7D32] rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <FiCheck className="w-8 h-8" strokeWidth={3} />
                </div>
                <h3 className="text-[20px] font-bold text-[#000000] font-Gantari mb-2">Updated Successfully!</h3>
                <p className="text-[14px] text-[#616161] font-Gantari">Redirecting to consultants list...</p>
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
                  onChange={(e) => setForm((f) => ({ ...f, full_name: normalizeSpaces(e.target.value) }))}
                  className="w-full px-4 py-2.5 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <div className="w-[100px] shrink-0">
                    <CustomDropdown
                      options={COUNTRY_CODES}
                      value={countryCode}
                      onChange={(val) => setCountryCode(val)}
                      placeholder="+91"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter Phone Number"
                    value={form.phone_number}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '');
                      setForm((f) => ({ ...f, phone_number: digitsOnly }));
                    }}
                    className="flex-1 px-4 py-2.5 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari text-gray-500">Password</label>
                <input
                  type="password"
                  value="********"
                  disabled
                  className="w-full px-4 py-2.5 text-[14px] text-[#8B8B8B] bg-[#E8E8E8] border border-transparent rounded-[5px] font-Gantari transition-all outline-none cursor-not-allowed"
                />
              </div>
              <div className="relative">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Role <span className="text-[#DD4342]">*</span></label>
                <CustomDropdown
                  options={allowedRolesList}
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
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Account Number <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  placeholder="Enter Account Number"
                  value={form.accountnumber}
                  onChange={(e) => setForm((f) => ({ ...f, accountnumber: e.target.value }))}
                  className="w-full px-4 py-2.5 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                  className="w-full px-4 py-2.5 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Email ID <span className="text-[#DD4342]">*</span></label>
                <input
                  type="email"
                  placeholder="Enter Email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value.trim() }))}
                  className="w-full px-4 py-2.5 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div className="relative">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Type</label>
                <CustomDropdown
                  options={['Trainee', 'Employee']}
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
                  className="w-full px-4 py-2.5 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Salary <span className="text-[#DD4342]">*</span></label>
                <input
                  type="text"
                  placeholder="00$"
                  value={form.salary}
                  onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                  className="w-full px-4 py-2.5 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[16px] font-semibold text-[#000000] font-Gantari">Update Profile Picture</label>
                <div className="flex items-center bg-[#F4F4F4] rounded-[5px] overflow-hidden transition-all focus-within:ring-1 focus-within:ring-[#D1E6FF]">
                  <div className="flex-1 px-4 text-[14px] text-[#979797] truncate">
                    {form.profile_picture ? form.profile_picture.name : 'Choose file (JPEG or JPG only)'}
                  </div>
                  <label className="px-5 py-2.5 bg-[#E0E0E0] text-[#353535] text-[14px] font-bold cursor-pointer transition-colors shrink-0 font-Gantari hover:bg-slate-300">
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
              onChange={(e) => setForm((f) => ({ ...f, address: normalizeSpaces(e.target.value) }))}
              className="w-full px-4 py-3 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
            />
          </div>

          <div className="mt-4 bg-[#F9F9F9] p-4 sm:p-8 rounded-[10px] border border-[#E0E0E0]">
            <h4 className="text-[18px] font-bold text-[#000000] mb-8 font-Gantari">Select Panel Access Control</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-6">
              {PANEL_ROLES.map((role, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 cursor-pointer group"
                  onClick={() => {
                    const currentRoles = [...form.roles];
                    if (currentRoles.includes(role)) {
                      setForm({ ...form, roles: currentRoles.filter(r => r !== role) });
                    } else {
                      setForm({ ...form, roles: [...currentRoles, role] });
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

          <div className="mt-8 pt-8 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <button
              type="button"
              onClick={() => navigate('/bc/consultants')}
              className="w-full sm:w-auto px-5 py-2 rounded-md bg-[#F2F2F2] text-[#000000] font-medium text-[16px] transition-all font-Gantari  cursor-pointer"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className={`w-full sm:w-auto px-5 py-2 rounded-md bg-[#D1E6FF] text-[#000000] font-medium text-[16px] transition-all font-Gantari  ${editSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {editSubmitting ? 'Updating...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
