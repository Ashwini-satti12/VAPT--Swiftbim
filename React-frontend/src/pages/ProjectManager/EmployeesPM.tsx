import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiGrid, FiMenu, FiChevronDown, FiX } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';
import { getPhoneLength } from '../../utils/countryCodes';

// Get API base URL for image URLs (so uploaded profile pictures load correctly)
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || '';
};

import pmprofilebg from '../../assets/ProjectManager/consultant/pmprofilebg.jpg';
import exportIcon from '../../assets/ProjectManager/consultant/exportIcon.svg';
import mailIcon from '../../assets/ProjectManager/consultant/mailIcon.svg';
import messageIcon from '../../assets/ProjectManager/consultant/messageIcon.svg';
import callIcon from '../../assets/ProjectManager/consultant/callIcon.svg';
import eyeIcon from '../../assets/ProjectManager/consultant/eyeIcon.svg';
import editIcon from '../../assets/ProjectManager/consultant/editIcon.svg';
// import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';
// const SHOW_OPTIONS = ["Show", "1-50", "51-100", "101-150", "151-200", "201-250", "251-300", "All"];
interface Employee {
  id: number;
  full_name: string;
  email: string;
  user_role?: string;
  active?: string;
  empid?: string;
  phone_number?: string;
  department?: string;
  address?: string;
  doj?: string;
  dob?: string;
  user_type?: string;
  profile_picture?: string;
  salary?: string;
  accountnumber?: string;
  Allpannel?: string;
}

// Build the correct URL for a stored profile picture (only used when a real photo exists)
const getProfileUrl = (path: string | undefined): string => {
  if (!path || path.trim() === '') return '';
  if (path.startsWith('http')) return path;

  // Normalize path separators
  let normalizedPath = path.replace(/\\/g, '/').trim();

  // Remove leading numbers and spaces (e.g., "1 WhatsApp..." or "0 anu.jpg")
  normalizedPath = normalizedPath.replace(/^\d+\s+/, '');

  // Remove leading slashes if any
  normalizedPath = normalizedPath.replace(/^\/+/, '');

  const apiBaseUrl = getApiBaseUrl();
  let urlPath = '';

  if (normalizedPath.startsWith('employee/')) {
    const parts = normalizedPath.split('/');
    const encodedParts = parts.map((part, index) =>
      index === 0 ? part : encodeURIComponent(part)
    );
    urlPath = `/uploads/${encodedParts.join('/')}`;
  } else if (normalizedPath.startsWith('profiles/')) {
    const filename = normalizedPath.replace('profiles/', '');
    urlPath = `/uploads/employee/${encodeURIComponent(filename)}`;
  } else if (!normalizedPath.includes('/')) {
    urlPath = `/uploads/employee/${encodeURIComponent(normalizedPath)}`;
  } else {
    const parts = normalizedPath.split('/');
    const encodedParts = parts.map((part, index) =>
      index === 0 ? part : encodeURIComponent(part)
    );
    urlPath = `/uploads/${encodedParts.join('/')}`;
  }

  const base = apiBaseUrl.replace(/\/$/, '');
  if (!base) {
    return urlPath; // relative path (works with Vite proxy)
  }
  return `${base}${urlPath}`;
};

const toCamelCase = (str: string): string => {
  if (!str) return str;
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};
// Fallback options; will be replaced by values loaded from backend department.name
const Departments_options = [
  'Technical','Sales','Operations','Human Resources','Accounts','Designing'
];
const ROLE_OPTIONS = [
  'Consultant',
  'BIM Coordinator',
  'BIM Lead',
  'Project Manager',
  'BIM Modeler',
  'BIM Architect',
  'BIM Architect Lead',
  'Tekla Modeler',
  'BIM Project Manager',
  'Business Development Manager',
  'Vice President Projects',
  'Junior BIM Modeler',
  'Architect Intern',
  'BIM Modeler- MEP',
  'HR Executive',
  'Graphic Designer',
  'Management'
];

const PANEL_ACCESS_OPTIONS = [
  'Management', 'Accounts', 'Technical Director','Admin', 'Project Manager','Client', 'Sales', 'BIM Lead','Employee','All'
];

const SCROLLBAR_STYLE = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
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
  className = "",
  styleType = "form"
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
  styleType?: "form" | "header" | "table";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between transition-all outline-none font-Gantari cursor-pointer ${styleType === "header"
            ? "px-3 py-1.5 bg-[#E8E8E8] rounded-md text-[14px] font-semibold"
            : styleType === "table"
              ? `px-4 py-2.5 min-w-[140px] rounded-lg border font-bold text-[14px] ${value === 'Active' ? 'bg-[#E1F6EB] border-[#A7F3D0] text-[#008F22]' : 'bg-[#FFE5E5] border-[#FECACA] text-[#E00100]'}`
              : `px-4 py-2 bg-[#F2F3F4] rounded-[5px] text-[14px] border border-transparent focus:outline-none focus:border-[#AEACAC52] ${isOpen ? "!border-[#AEACAC52]" : ""}`
          }`}
      >
        <span className={`whitespace-nowrap ${
            (styleType === "header" || styleType === "form")
              ? (value && value !== placeholder && value !== "All" && value !== "Show" && value !== "Type" && value !== "Status" ? "text-[#353535]" : "text-[#8B8B8B]")
              : ""
          }`}>
          {styleType === "header" && value && value !== placeholder && value !== "All" && value !== "Show" && value !== "Status" && value !== "Type" ? (
            <>
              <span className="text-sm">{placeholder}:</span>{" "}
              <span className="font-semibold">{toCamelCase(value)}</span>
            </>
          ) : (
            value || placeholder
          )}
        </span>
        <FiChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${styleType === "table" ? "opacity-70" : "text-slate-500"}`} />
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
                className={`w-full text-left px-4 py-2.5 text-[14px] font-medium font-Gantari transition-colors cursor-pointer ${value === option ? 'text-[#353535]' : 'text-[#8B8B8B]'} hover:text-[#353535] hover:bg-[#F2F2F2] transition-colors`}
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

export default function EmployeesPM() {
  const navigate = useNavigate();
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = SCROLLBAR_STYLE;
    document.head.appendChild(styleTag);
    return () => { document.head.removeChild(styleTag); };
  }, []);

  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'list' | 'add' | 'edit' | 'invite' | 'inactive'>('list');
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const effectivePerPage = 10;

  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
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
    salary: '',
    accountnumber: '',
    roles: [] as string[],
    profile_picture: null as File | null,
    active: 'Active',
  });
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inactiveIds, setInactiveIds] = useState<number[]>([]);
  const [inactiveSubmitting, setInactiveSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    country_code: '+91',
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
    roles: [] as string[],
    active: 'Active',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+65', '+81'];

  const getDateMinusDaysInput = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Per your request: disable selecting "yesterday and above"
  // => allow only dates <= (today - 2 days)
  const dobMaxDate = getDateMinusDaysInput(2);

  const parsePhone = (raw: string): { country_code: string; phone_digits: string } => {
    const s = String(raw || '').trim();
    const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.length - a.length);
    for (const code of sortedCodes) {
      if (s.startsWith(code)) {
        return {
          country_code: code,
          phone_digits: s.slice(code.length).replace(/\D/g, ''),
        };
      }
    }
    return { country_code: COUNTRY_CODES[0], phone_digits: s.replace(/\D/g, '') };
  };
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedShow, setSelectedShow] = useState<string>("Show");
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(Departments_options);

  const canAdd = user?.panel_type === 1;


  useEffect(() => {
    api.get<{ employees?: Employee[] }>('/api/employees').then(({ data }) => setList(data.employees ?? [])).catch(() => setList([])).finally(() => setLoading(false));
  }, []);

  // Load departments from backend (department table, name field)
  useEffect(() => {
    api.get<{ departments?: string[] }>('/api/departments')
      .then(({ data }) => {
        if (Array.isArray(data.departments)) {
          // Deduplicate by case-insensitive name
          const map = new Map<string, string>();
          data.departments
            .filter(Boolean)
            .forEach((name) => {
              const trimmed = String(name).trim();
              if (!trimmed) return;
              const key = trimmed.toLowerCase();
              if (!map.has(key)) {
                map.set(key, trimmed);
              }
            });
          const fromBackend = Array.from(map.values());
          if (fromBackend.length) {
            setDepartmentOptions(fromBackend);
          }
        }
      })
      .catch(() => {
        // On error, keep existing fallback Departments_options
        setDepartmentOptions(Departments_options);
      });
  }, []);

  const filteredList = list.filter((emp: Employee) => {
    // 1. Status Filter
    if (statusFilter !== 'All') {
      const currentStatus = (emp.active || '').toLowerCase();
      if (statusFilter === 'Active' && currentStatus !== 'active') return false;
      if (statusFilter === 'Inactive' && currentStatus === 'active') return false;
    }

    // 2. Type Filter
    if (typeFilter !== 'All') {
      const currentType = (emp.user_type || '').toLowerCase();
      if (typeFilter === 'Employee' && currentType !== 'employee') return false;
      if (typeFilter === 'Trainee' && currentType !== 'trainee') return false;
    }

    return true;
  });

  let limitStart = 0;
  let limitEnd = Infinity;
  if (selectedShow && selectedShow.includes("-")) {
      const parts = selectedShow.split("-");
      if (parts.length === 2) {
          limitStart = parseInt(parts[0], 10) - 1;
          limitEnd = parseInt(parts[1], 10);
      }
  } else if (selectedShow === "All") {
      limitStart = 0;
      limitEnd = Infinity;
  }

  const displayedList = filteredList.slice(limitStart, limitEnd);
  const totalPages = Math.ceil(filteredList.length / effectivePerPage);


  function exportCsv() {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Phone', 'Department', 'Account Number', 'Salary'];
    const rows = list.map((e) =>
      [
        e.full_name,
        e.email,
        e.user_role || '',
        e.active || '',
        e.phone_number || '',
        e.department || '',
        e.accountnumber || '',
        e.salary || '',
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'consultants.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const emails = inviteEmails.replace(/,/g, ' ').split(/\s+/).filter((e) => e.trim());
    if (!emails.length) return;
    setInviteSubmitting(true);
    api.post('/api/employees/invite', { emails, message: inviteMessage }).then(() => {
      setActiveView('list');
      setInviteEmails('');
      setInviteMessage('');
    }).catch(() => { }).finally(() => setInviteSubmitting(false));
  }

  function handleInactive() {
    if (!inactiveIds.length) return;
    setInactiveSubmitting(true);
    api.post('/api/employees/bulk-status', { ids: inactiveIds, action: 'inactive' }).then(() => {
      setList((prev) => prev.map((e) => (inactiveIds.includes(e.id) ? { ...e, active: 'inactive' } : e)));
      setActiveView('list');
      setInactiveIds([]);
    }).catch(() => { }).finally(() => setInactiveSubmitting(false));
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;

    const phoneDigits = String(editForm.phone_number || '').replace(/\D/g, '');
    if (!editForm.country_code) {
      alert('Please select country code.');
      return;
    }
    const expectedLength = getPhoneLength(editForm.country_code);
    if (phoneDigits.length !== expectedLength) {
      alert(`Phone number must be exactly ${expectedLength} digits for ${editForm.country_code}.`);
      return;
    }
    if (editForm.dob && editForm.dob > dobMaxDate) {
      alert('Date of birth cannot be yesterday and above.');
      return;
    }

    setEditSubmitting(true);

    // Build payload with all fields from redesign
    const payload = {
      full_name: editForm.full_name,
      email: editForm.email,
      phone_number:
        editForm.phone_number && editForm.country_code
          ? `${editForm.country_code}${editForm.phone_number}`.replace(/\s+/g, '')
          : undefined,
      user_role: editForm.user_role,
      department: editForm.department || undefined,
      address: editForm.address || undefined,
      dob: editForm.dob || undefined,
      doj: editForm.doj || undefined,
      salary: editForm.salary || undefined,
      accountnumber: editForm.accountnumber || undefined,
      user_type: editForm.user_type || undefined,
      Allpannel: editForm.roles.join(','),
      active: editForm.active === 'Active' ? 'active' : 'inactive',
      ...(editForm.password ? { password: editForm.password } : {})
    };

    api.patch(`/api/employees/${editId}`, payload)
      .then(() => {
        setList((prev) => prev.map((e) => {
          if (e.id === editId) {
            return {
              ...e,
              full_name: editForm.full_name,
              email: editForm.email,
              phone_number: editForm.phone_number,
              user_role: editForm.user_role,
              department: editForm.department,
              address: editForm.address,
              dob: editForm.dob,
              doj: editForm.doj,
              salary: editForm.salary,
              accountnumber: editForm.accountnumber,
              user_type: editForm.user_type,
              Allpannel: payload.Allpannel,
              active: editForm.active === 'Active' ? 'active' : 'inactive',
            };
          }
          return e;
        }));
        setEditId(null);
        setActiveView('list');
      })
      .catch((err) => {
        console.error('Update failed:', err);
      })
      .finally(() => setEditSubmitting(false));
  }

  function handleStatusToggle(id: number, newStatus: string) {
    const status = newStatus.toLowerCase() === 'active' ? 'active' : 'inactive';
    api.post('/api/employees/bulk-status', { ids: [id], action: status }).then(() => {
      setList(prev => prev.map(e => e.id === id ? { ...e, active: status } : e));
    });
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setAddError('Name, email and password are required.');
      return;
    }

    if (!form.country_code) {
      setAddError('Please select country code.');
      return;
    }

    const phoneDigits = String(form.phone_number || '').replace(/\D/g, '');
    const expectedLength = getPhoneLength(form.country_code);
    if (phoneDigits.length !== expectedLength) {
      setAddError(`Phone number must be exactly ${expectedLength} digits for ${form.country_code}.`);
      return;
    }

    if (form.dob && form.dob > dobMaxDate) {
      setAddError(`Date of birth cannot be ${dobMaxDate.split('-')[2]}/${dobMaxDate.split('-')[1]}/${dobMaxDate.split('-')[0]} or later.`);
      return;
    }

    setAddSubmitting(true);

    const formData = new FormData();
    formData.append('full_name', form.full_name.trim());
    formData.append('email', form.email.trim());
    formData.append('password', form.password);
    if (form.phone_number.trim()) {
      formData.append(
        'phone_number',
        `${form.country_code}${form.phone_number.trim()}`.replace(/\s+/g, '')
      );
    }
    if (form.user_role) formData.append('user_role', form.user_role);
    if (form.address.trim()) formData.append('address', form.address.trim());
    if (form.dob) formData.append('dob', form.dob);
    if (form.type) formData.append('user_type', form.type);
    if (form.joining_date) formData.append('doj', form.joining_date);
    if (form.department) formData.append('department', form.department);
    if (form.salary.trim()) formData.append('salary', form.salary.trim());
    if (form.accountnumber.trim()) formData.append('accountnumber', form.accountnumber.trim());
    if (form.roles.length) formData.append('roles', form.roles.join(','));
    if (form.active) formData.append('active', form.active === 'Active' ? 'active' : 'inactive');
    if (form.profile_picture) {
      formData.append('profile_picture', form.profile_picture);
    }

    api
      .post<{ success: boolean; id?: number; message?: string; profile_picture?: string | null }>(
        '/api/employees',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      .then(({ data }) => {
        if (data.success) {
          setActiveView('list');
          setForm({
            full_name: '',
            email: '',
            password: '',
            phone_number: '',
            country_code: '+91',
            type: '',
            user_role: 'Consultant',
            department: '',
            address: '',
            dob: '',
            joining_date: '',
            profile_picture: null,
            salary: '',
            accountnumber: '',
            roles: [],
            active: 'Active',
          });
          setList((prev) => [
            ...prev,
            {
              id: data.id!,
              full_name: form.full_name,
              email: form.email,
              user_role: form.user_role,
              active: form.active === 'Active' ? 'active' : 'inactive',
              dob: form.dob,
              user_type: form.type,
              doj: form.joining_date,
              address: form.address,
              salary: form.salary,
              accountnumber: form.accountnumber,
              Allpannel: form.roles.join(','),
              profile_picture: data.profile_picture || undefined,
            },
          ]);
        } else {
          setAddError(data.message || 'Failed to add consultant.');
        }
      })
      .catch((err) => setAddError(err.response?.data?.message || 'Failed to add consultant.'))
      .finally(() => setAddSubmitting(false));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {(activeView === 'list' || activeView === 'invite' || activeView === 'inactive') && (
        <>
          <div className="sticky z-50 bg-white mb-4 mt-2">
            {/* ROW 1 */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <h2 className="text-[24px] font-Gantari font-semibold text-[#000000] tracking-tight">
                Consultant
              </h2>
              {canAdd && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveView('add')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap cursor-pointer"
                  >
                    <FiPlus className="w-[18px] h-[18px] sm:w-[24px] sm:h-[24px]" />
                    Add Consultant
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('invite')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap cursor-pointer"
                  >
                    <FiPlus className="w-[18px] h-[18px] sm:w-[24px] sm:h-[24px]" />
                    Invite
                  </button>
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap cursor-pointer"
                  >
                    <img src={exportIcon} alt="Export" className="w-[18px] h-[18px] sm:w-[24px] sm:h-[24px]" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('inactive')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap cursor-pointer"
                  >
                    Manage Inactive
                  </button>
                </div>
              )}
            </div>
            {/* ROW 2 */}
            <div className="flex flex-col sm:flex-row justify-between sm:justify-end items-start sm:items-center gap-4 mt-6 sm:mt-8 mb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-full transition-all cursor-pointer ${viewMode === 'table' ? 'bg-[#DD4342] text-[#F2F2F2]' : 'bg-[#E0E0E0] text-[#000000]'}`}
                >
                  <FiMenu className="w-5 h-5 sm:w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded-full transition-all cursor-pointer ${viewMode === 'card' ? 'bg-[#DD4342] text-[#F2F2F2]' : 'bg-[#E0E0E0] text-[#000000]'}`}
                >
                  <FiGrid className="w-5 h-5 sm:w-6 h-6" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">

                {/* Show Dropdown */}
                {viewMode === 'table' && (
                  <CustomDropdown
                    options={['1-50', '51-100', '101-150', '151-200', '201-250', '251-300', 'All']}
                    value={selectedShow === 'Show' ? 'Show' : selectedShow}
                    onChange={(val) => setSelectedShow(val)}
                    placeholder="Show"
                    className="flex-1 sm:min-w-[120px] cursor-pointer"
                    styleType="header"
                  />
                )}

                <CustomDropdown
                  options={['All', 'Employee', 'Trainee']}
                  value={typeFilter === 'All' ? 'Type' : typeFilter}
                  onChange={(val) => setTypeFilter(val)}
                  placeholder="Type"
                  className="flex-1 sm:min-w-[120px] cursor-pointer"
                  styleType="header"
                />
                <CustomDropdown
                  options={viewMode === 'card' ? ['All', 'Active', 'Deactive'] : ['All', 'Active', 'Inactive']}
                  value={statusFilter === 'All' ? 'Status' : statusFilter}
                  onChange={(val) => {
                    let nextStatus = val;
                    if (viewMode === 'card' && val === 'Deactive') nextStatus = 'Inactive';
                    setStatusFilter(nextStatus);
                  }}
                  placeholder="Status"
                  className="flex-1 sm:min-w-[120px] cursor-pointer"
                  styleType="header"
                />
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 p-4 sm:p-6">
            {displayedList.length === 0 ? (
              <div className="col-span-full bg-white rounded-[10px] border border-slate-200 p-8 sm:p-12 text-center text-slate-500 shadow-sm">
                No consultants found.
              </div>
            ) : (
              filteredList.map((emp: Employee) => (
                <div key={emp.id} className="bg-white rounded-[10px] overflow-hidden border-1 border-slate-200 transition-all">
                  {/* Image Section */}
                  <div className="relative h-[128px] overflow-hidden group">
                    <div className="absolute inset-0 z-0">
                      <img
                        src={pmprofilebg}
                        alt="Background"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30" />
                    </div>

                    {/* Top Status - Pill Shape */}
                    <div className="absolute top-3 right-3 z-10">
                      <div className={`flex items-center gap-1.5 px-2 rounded-full border shadow-sm ${emp.active === 'active' ? 'bg-[#E0FFE8] border-emerald-100' : 'bg-[#FFEEEE] border-red-100'}`}>
                        <span className={`w-2 h-2 rounded-full ${emp.active === 'active' ? 'bg-[#166534]' : 'bg-[#E00100]'}`}></span>
                        <span className={`text-[11px] font-semibold ${emp.active === 'active' ? 'text-[#008F22]' : 'text-[#E00100]'}`}>
                          {emp.active === 'active' ? 'Active' : 'Deactive'}
                        </span>
                      </div>
                    </div>
                    {/* User info on image: show uploaded photo if available, otherwise initials */}
                    <div className="absolute inset-x-0 bottom-0 p-4 flex items-center gap-4 z-10">
                      <div className="w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-white overflow-hidden shrink-0 border-2 border-white shadow-sm">
                        {emp.profile_picture && emp.profile_picture.trim() ? (
                          <img
                            src={getProfileUrl(emp.profile_picture)}
                            alt={emp.full_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // If the photo fails, fall back to initials
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-[20px] font-semibold text-[#1A1A1A]">
                              {toCamelCase(emp.full_name).charAt(0) || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[18px] sm:text-[22px] font-Gantari font-semibold text-[#F2F2F2] leading-tight tracking-tight truncate">
                          {toCamelCase(emp.full_name)}
                        </h3>
                        <p className="text-[14px] sm:text-[16px] text-[#F2F2F2] mt-1 truncate">
                          {emp.user_role || 'Consultant'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-4 space-y-4 sm:space-y-5">
                    {/* Contact Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button 
                        onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${emp.email}`, '_blank')}
                        className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[12px] sm:text-[13px] font-semibold font-Gantari cursor-pointer"
                      >
                        <img src={mailIcon} alt="Mail" className="w-4 h-4" /> Mail
                      </button>
                      <button 
                        onClick={() => navigate('/chat')}
                        className="flex-[1.4] min-w-[90px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[12px] sm:text-[13px] font-semibold font-Gantari cursor-pointer"
                      >
                        <img src={messageIcon} alt="Message" className="w-4 h-4" /> Message
                      </button>
                      <button 
                        onClick={() => window.location.href = `tel:${emp.phone_number || ''}`}
                        className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[12px] sm:text-[13px] font-semibold font-Gantari cursor-pointer"
                      >
                        <img src={callIcon} alt="Call" className="w-4 h-4" /> Call
                      </button>
                    </div>

                    <hr className="border-slate-200" />

                    {/* Actions Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setSelectedEmployee(emp); setShowDetailsModal(true); }}
                        className="flex items-center justify-center gap-2 py-2 bg-[#DD4342] text-white rounded-[5px] text-[13px] sm:text-[14px] font-Gantari cursor-pointer"
                      >
                        <img src={eyeIcon} alt="View" className="w-4 h-4 sm:w-5 sm:h-5" /> View
                      </button>
                      {canAdd && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(emp.id);
                            setActiveView('edit');
                            const parsed = parsePhone(emp.phone_number || '');
                            setEditForm({
                              full_name: emp.full_name,
                              email: emp.email,
                              phone_number: parsed.phone_digits,
                              country_code: parsed.country_code,
                              user_role: emp.user_role || 'Consultant',
                              department: emp.department || '',
                              address: emp.address || '',
                              dob: emp.dob || '',
                              password: '',
                              user_type: emp.user_type || '',
                              doj: emp.doj || '',
                              salary: emp.salary || '',
                              accountnumber: emp.accountnumber || '',
                              profile_picture: null,
                              roles: emp.Allpannel ? emp.Allpannel.split(',').map((r: string) => r.trim()) : [],
                              active: emp.active === 'active' ? 'Active' : 'Deactivate',
                            });
                          }}
                          className="flex items-center justify-center gap-2 py-2 bg-[#F2F2F2] text-[#353535] rounded-[5px] text-[13px] sm:text-[14px] font-Gantari cursor-pointer"
                        >
                          <img src={editIcon} alt="Edit" className="w-4 h-4 sm:w-5 sm:h-5" /> Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className=" sticky top-0 z-40 border border-[#F0F0F0] rounded-[15px] overflow-hidden bg-white">
              <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-40">
                  <tr className="bg-white">
                    <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">
                      Sl.No
                    </th>
                    <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Emp ID</th>
                    <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Consultant Name</th>
                    <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Email ID</th>
                    <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Contact Info</th>
                    <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-Gantari">
                        No consultants found.
                      </td>
                    </tr>
                  ) : (
                    displayedList.map((emp, idx) => {
                      const slNo = (currentPage - 1) * effectivePerPage + idx + 1;
                      const slNoDisplay = String(slNo).padStart(2, '0');
                      return (
                      <tr key={emp.id} className={`${idx % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                        <td className="px-6 py-5 text-center text-[15px] font-medium font-Gantari text-[#6B6B6B]">
                          {slNoDisplay}
                        </td>


                        <td className="px-6 py-5 text-center text-[15px] font-semibold font-Gantari text-[#6B6B6B] whitespace-nowrap">
                          {emp.empid || `EMP-${(emp.id + 150).toString().padStart(4, '0')}`}
                        </td>

                        <td className="px-6 py-5 ">
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-200">
                                {emp.profile_picture && emp.profile_picture.trim() ? (
                                  <img
                                    src={getProfileUrl(emp.profile_picture)}
                                    alt={emp.full_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Hide broken image; the status dot + name still show
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-[16px] font-semibold text-[#1A1A1A]">
                                      {toCamelCase(emp.full_name).charAt(0) || 'U'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <span className={`absolute top-0 left-0 w-3 h-3 border-2 border-white rounded-full ${emp.active === 'active' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}></span>
                            </div>
                            <span className="text-[16px] font-semibold font-Gantari text-[#353535]">{toCamelCase(emp.full_name)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center text-[15px] font-medium font-Gantari text-[#353535]">{emp.email}</td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button 
                              onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${emp.email}`, '_blank')}
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] transition-colors cursor-pointer"
                            >
                              <img src={mailIcon} className="w-5 h-5" alt="Mail" />
                            </button>
                            <button 
                              onClick={() => navigate('/chat')}
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] transition-colors cursor-pointer"
                            >
                              <img src={messageIcon} className="w-5 h-5" alt="Message" />
                            </button>
                            <button 
                              onClick={() => window.location.href = `tel:${emp.phone_number || ''}`}
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] transition-colors cursor-pointer"
                            >
                              <img src={callIcon} className="w-5 h-5" alt="Call" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="inline-block min-w-[140px]">
                            <CustomDropdown
                              options={['Active', 'Deactivate']}
                              className="cursor-pointer"
                              value={emp.active === 'active' ? 'Active' : 'Deactivate'}
                              onChange={(val) => handleStatusToggle(emp.id, val)}
                              placeholder="Status"
                              styleType="table"
                            />
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-auto pt-4 bg-white sticky bottom-0 border-t border-slate-100">
                <div className="text-[14px] font-semibold text-[#353535] font-Gantari">
                  Showing {(currentPage - 1) * effectivePerPage + 1} to {Math.min(currentPage * effectivePerPage, filteredList.length)} of {filteredList.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2.5 rounded-[5px] border border-[#E0E0E0] disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <FiChevronDown className="w-5 h-5 rotate-90" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-[5px] border font-semibold font-Gantari transition-all cursor-pointer ${currentPage === page ? 'bg-[#DD4342] border-[#DD4342] text-white' : 'border-[#E0E0E0] text-[#353535] hover:bg-slate-50'}`}
                    >
                      {String(page).padStart(2, '0')}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2.5 rounded-[5px] border border-[#E0E0E0] disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <FiChevronDown className="w-5 h-5 -rotate-90" />
                  </button>
                </div>
              </div>
            )}
          </div>

        )}
      </div>


        </>
      )}

      {activeView === 'add' && (
        <div className="flex-1 overflow-y-auto p-2 bg-white">
          <div className="max-w-[1174px] mx-auto">
            <div className="flex items-center justify-between mb-8 sm:mb-10 relative">
              <button
                type="button"
                onClick={() => { setActiveView('list'); setAddError(''); }}
                className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
                title="Back"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
              </button>
              <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">Add New Consultant</h3>
              <div className="w-10" />
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-6">
              {addError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{addError}</p>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                {/* Column 1 */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Employee Name</label>
                    <input
                      type="text"
                      placeholder="Enter Employee Name"
                      value={form.full_name}
                      onChange={(e) => setForm((f: any) => ({ ...f, full_name: e.target.value }))}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Phone Number</label>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <CustomDropdown
                          options={COUNTRY_CODES}
                          value={form.country_code}
                          onChange={(val) => setForm((f: any) => ({ ...f, country_code: val }))}
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
                      type="password"
                      placeholder="Enter Password"
                      value={form.password}
                      onChange={(e) => setForm((f: any) => ({ ...f, password: e.target.value }))}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      required
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Role</label>
                    <CustomDropdown
                      options={ROLE_OPTIONS}
                      value={form.user_role}
                      onChange={(val) => setForm((f: any) => ({ ...f, user_role: val }))}
                      placeholder="Select Role"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Department</label>
                    <CustomDropdown
                      options={departmentOptions}
                      value={form.department}
                      onChange={(val) => setForm((f: any) => ({ ...f, department: val }))}
                      placeholder="Select Department"
                    />
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Birth</label>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setForm((f: any) => ({ ...f, dob: e.target.value }))}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      max={dobMaxDate}
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Email ID</label>
                    <input
                      type="email"
                      placeholder="Enter Email"
                      value={form.email}
                      onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      required
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Type</label>
                    <CustomDropdown
                      options={['Trainee', 'Consultant',]}
                      className="cursor-pointer"
                      value={form.type}
                      onChange={(val) => setForm((f: any) => ({ ...f, type: val }))}
                      placeholder="Select Type"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Joining</label>
                    <input
                      type="date"
                      value={form.joining_date}
                      onChange={(e) => setForm((f: any) => ({ ...f, joining_date: e.target.value }))}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[16px] font-semibold text-[#000000] font-Gantari">Upload Profile Picture</label>
                    <div className="flex items-center bg-[#F4F4F4] rounded-[5px] overflow-hidden">
                      <div className="flex-1 px-4 text-[14px] text-[#979797] truncate">
                        {form.profile_picture ? form.profile_picture.name : 'Choose file (JPEG or JPG only)'}
                      </div>
                      <label className="px-5 py-3 bg-[#E0E0E0] text-[#353535] text-[14px] font-bold cursor-pointer transition-colors shrink-0 font-Gantari">
                        Browse File
                        <input
                          type="file"
                          className="hidden cursor-pointer"
                          accept=".jpg,.jpeg"
                          onChange={(e) => setForm((f: any) => ({ ...f, profile_picture: e.target.files ? e.target.files[0] : null }))}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Field */}
              <div className="mt-2">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Address</label>
                <textarea
                  rows={4}
                  placeholder="Type your Address..."
                  value={form.address}
                  onChange={(e) => setForm((f: any) => ({ ...f, address: e.target.value }))}
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-semibold text-[16px] transition-all font-Gantari min-w-[160px] cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] disabled:opacity-50 transition-all font-Gantari min-w-[160px] cursor-pointer"
                >
                  {addSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeView === 'edit' && (
        <div className="flex-1 overflow-y-auto p-2 bg-white">
          <div className="max-w-[1174px] mx-auto">
            <div className="flex items-center justify-between mb-8 sm:mb-10 relative">
              <button
                type="button"
                onClick={() => { setActiveView('list'); setEditId(null); }}
                className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
                title="Back"
              >
                <img src={backIcon} alt="Back" className="w-5 h-5" />
              </button>
              <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">Edit Consultant Details</h3>
              <div className="w-10" />
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                {/* Column 1 */}
                <div className="space-y-5">
                <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Employee Name</label>
                  <input
                    type="text"
                      placeholder="Enter Employee Name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, full_name: e.target.value }))}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52] disabled:opacity-70 disabled:cursor-not-allowed"
                    required
                    disabled
                  />
                </div>
                <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Phone Number</label>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <CustomDropdown
                        options={COUNTRY_CODES}
                        value={editForm.country_code}
                        onChange={(val) => setEditForm((f: any) => ({ ...f, country_code: val }))}
                        placeholder="Select Code"
                      />
                    </div>
                    <div className="flex-[2]">
                      <input
                        type="text"
                        placeholder="Enter Phone Number"
                        value={editForm.phone_number}
                        onChange={(e) =>
                          setEditForm((f: any) => ({
                            ...f,
                            phone_number: e.target.value.replace(/\D/g, '').slice(0, getPhoneLength(f.country_code)),
                          }))
                        }
                        className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      />
                    </div>
                  </div>
                </div>
                <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Password</label>
                    <input
                      type="password"
                      placeholder="******** (password hidden)"
                      value={editForm.password}
                      onChange={(e) => setEditForm((f: any) => ({ ...f, password: e.target.value }))}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52] disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Role</label>
                    <CustomDropdown
                      options={ROLE_OPTIONS}
                      className="cursor-pointer"
                      value={editForm.user_role}
                      onChange={(val) => setEditForm((f: any) => ({ ...f, user_role: val }))}
                      placeholder="Select Role"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Department</label>
                    <CustomDropdown
                      options={departmentOptions}
                      className="cursor-pointer"
                      value={editForm.department}
                      onChange={(val) => setEditForm((f: any) => ({ ...f, department: val }))}
                      placeholder="Select Department"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Account Number</label>
                  <input
                    type="text"
                      placeholder="Enter Account Number"
                      value={editForm.accountnumber}
                      onChange={(e) => setEditForm((f: any) => ({ ...f, accountnumber: e.target.value }))}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-5">
                <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Birth</label>
                    <input
                      type="date"
                      value={editForm.dob}
                      onChange={(e) => setEditForm((f: any) => ({ ...f, dob: e.target.value }))}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      max={dobMaxDate}
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Email ID</label>
                  <input
                    type="email"
                    placeholder="Enter Email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52] disabled:opacity-70 disabled:cursor-not-allowed"
                    required
                    disabled
                  />
                </div>
                <div className="relative">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Type</label>
                  <CustomDropdown
                    options={['Employee', 'Trainee' ]}
                    className="cursor-pointer"
                    value={editForm.user_type}
                    onChange={(val) => setEditForm((f: any) => ({ ...f, user_type: val }))}
                    placeholder="Select Type"
                  />
                </div>
                <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Joining</label>
                  <input
                    type="date"
                    value={editForm.doj}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, doj: e.target.value }))}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
                <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Salary</label>
                  <input
                    type="text"
                    placeholder="0000$"
                    value={editForm.salary}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, salary: e.target.value }))}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
                <div className="space-y-2">
                    <label className="block text-[16px] font-semibold text-[#000000] font-Gantari">Update Profile Picture</label>
                  <div className="flex items-center bg-[#F4F4F4] rounded-[5px] overflow-hidden">
                    <div className="flex-1 px-4 text-[14px] text-[#979797] truncate">
                      {editForm.profile_picture ? editForm.profile_picture.name : 'Choose file (JPEG or JPG only)'}
                    </div>
                    <label className="px-5 py-3 bg-[#E0E0E0] text-[#353535] text-[14px] font-bold cursor-pointer transition-colors shrink-0 font-Gantari">
                      Browse File
                      <input
                        type="file"
                        className="hidden cursor-pointer"
                        accept=".jpg,.jpeg"
                        onChange={(e) => setEditForm((f: any) => ({ ...f, profile_picture: e.target.files ? e.target.files[0] : null }))}
                      />
                    </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Width Field */}
              <div className="mt-2">
                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Address</label>
                <textarea
                  rows={4}
                  placeholder="Type your Address..."
                  value={editForm.address}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, address: e.target.value }))}
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
                />
              </div>

              {/* Access Control Section */}
              <div className="mt-8">
                <label className="block text-[18px] font-semibold text-[#000000] mb-4 font-Gantari">Select Panel Access Control</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-4 gap-x-6 p-6 bg-[#F9F9F9] rounded-[10px]">
                  {PANEL_ACCESS_OPTIONS.map((role) => (
                    <div key={role} className="flex items-center gap-3">
                      <div
                        onClick={() => {
                          const newRoles = editForm.roles.includes(role)
                            ? editForm.roles.filter(r => r !== role)
                            : [...editForm.roles, role];
                          setEditForm({ ...editForm, roles: newRoles });
                        }}
                        className={`w-6 h-6 rounded-[4px] border-2 flex items-center justify-center cursor-pointer transition-all ${
                          editForm.roles.includes(role) ? 'bg-[#D1E6FF] border-[#D1E6FF]' : 'bg-white border-[#E0E0E0]'
                        }`}
                      >
                        {editForm.roles.includes(role) && (
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

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8">
                <button
                  type="button"
                  onClick={() => { setActiveView('list'); setEditId(null); }}
                  className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-semibold text-[16px] transition-all font-Gantari min-w-[160px] cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] disabled:opacity-50 transition-all font-Gantari min-w-[160px] cursor-pointer"
                >
                  {editSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeView === 'invite' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]">
          <div className="bg-white rounded-[20px] max-w-[813px] w-full max-h-[90vh] overflow-hidden p-8 sm:p-10 relative shadow-2xl flex flex-col font-Gantari">
            <div className="flex items-center justify-center mb-8 relative">
              <button
                type="button"
                onClick={() => { setActiveView('list'); setInviteEmails(''); setInviteMessage(''); }}
                className="absolute left-0 p-2.5 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
              >
                <FiX className="w-5 h-5 font-bold" />
              </button>
              <h3 className="text-[24px] font-semibold text-[#020202] text-center">Invite New Consultant</h3>
            </div>

            <form onSubmit={handleInvite} className="space-y-8 overflow-y-auto custom-scrollbar pr-2">
              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-3">Email Addresses</label>
                <textarea
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  rows={4}
                  className="w-full px-5 py-4 bg-[#F4F4F4] border-none rounded-[10px] text-[15px] placeholder:text-[#979797] font-medium transition-all outline-none resize-none leading-relaxed"
                  placeholder="Enter Multiple Email addresses separated by commas,"
                />
                <p className="text-[14px] text-[#666666] mt-3 font-medium">Separate multiple emails with commas (eg., email01@eg.com)</p>
              </div>

              <div>
                <label className="block text-[16px] font-semibold text-[#000000] mb-3">Invitation Message</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={4}
                  className="w-full px-5 py-4 bg-[#F4F4F4] border-none rounded-[10px] text-[15px] placeholder:text-[#979797] font-medium transition-all outline-none resize-none leading-relaxed"
                  placeholder="Enter your Invitation Message.,"
                />
              </div>

              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-12 py-3 rounded-[5px] bg-[#D1E6FF] text-[#1A1A1A] font-bold text-[16px] disabled:opacity-50 transition-all min-w-[200px] cursor-pointer"
                >
                  {inviteSubmitting ? 'Sending...' : 'Send Invitations'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {activeView === 'inactive' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]">
          <div className="bg-white rounded-[20px] max-w-[950px] w-full max-h-[90vh] overflow-hidden p-8 sm:p-10 relative shadow-2xl flex flex-col font-Gantari">
            <div className="flex items-center justify-center mb-8 relative shrink-0">
              <button
                type="button"
                onClick={() => { setActiveView('list'); setInactiveIds([]); }}
                className="absolute left-0 p-2.5 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
              >
                <FiX className="w-5 h-5 font-bold" />
              </button>
              <h3 className="text-[24px] font-semibold text-[#020202] text-center">Manage In-active Consultants</h3>
            </div>

            <div className="shrink-0 mb-8 px-4">
              <p className="text-[15px] text-[#353535] mb-2 leading-relaxed font-medium">
                Select Consultants to mark as IN-Active. In-Active Consultants will not appear in Project Assignment dropdowns.
              </p>
              <p className="text-[16px] font-semibold text-[#3d3399]">
                {inactiveIds.length} Consultant(s) will be marked as In-Active
              </p>
            </div>

            <div className="flex-1 overflow-y-auto border border-[#E0E0E0] rounded-[15px] custom-scrollbar mb-10">
              {(() => {
                const grouped = list.reduce((acc: Record<string, Employee[]>, emp) => {
                  const role = emp.user_role || 'General';
                  if (!acc[role]) acc[role] = [];
                  acc[role].push(emp);
                  return acc;
                }, {});

                return Object.entries(grouped).map(([role, emps]) => (
                  <div key={role} className="border-b border-[#E0E0E0] last:border-none">
                    <div className="px-6 py-4 bg-white font-semibold text-[16px] text-[#000000] border-b border-[#F0F0F0]">
                      {role}
                    </div>
                    <div className="divide-y divide-[#F0F0F0]">
                      {emps.map((emp) => (
                        <div
                          key={emp.id}
                          className="flex items-center justify-between px-6 py-4  transition-colors"
                        >
                          <div className="flex items-center gap-6">
                            <div
                              onClick={() => setInactiveIds((prev) => (prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]))}
                              className={`w-7 h-7 rounded-[5px] border-2 cursor-pointer flex items-center justify-center transition-all ${inactiveIds.includes(emp.id) ? 'bg-[#D1E6FF] border-[#D1E6FF]' : 'bg-white border-[#E0E0E0]'}`}
                            >
                              {inactiveIds.includes(emp.id) && (
                                <svg width="16" height="12" viewBox="0 0 14 11" fill="none">
                                  <path d="M1 5L5 9L13 1" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <span className="text-[16px] font-semibold text-[#6B6B6B]">
                              {emp.full_name} {emp.empid ? `(${emp.empid})` : `(EMP-${(emp.id + 150).toString().padStart(4, '0')})`}
                            </span>
                          </div>
                          {(emp.active === 'inactive' || emp.active === 'deactive') && (
                            <span className="px-4 py-1.5 bg-[#FFE6E6] text-[#E00100] text-[12px] font-semibold rounded-[5px] shrink-0">
                              Currently In-Active
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="flex justify-center gap-6 pt-4 shrink-0">
              <button
                type="button"
                onClick={() => { setActiveView('list'); setInactiveIds([]); }}
                className="px-12 py-3 rounded-[5px] bg-[#F4F4F4] text-[#353535] font-semibold text-[16px] transition-all min-w-[150px] cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleInactive}
                disabled={!inactiveIds.length || inactiveSubmitting}
                className="px-12 py-3 rounded-[5px] bg-[#D1E6FF] text-[#1A1A1A] font-semibold text-[16px] disabled:opacity-50 transition-all min-w-[180px] cursor-pointer"
              >
                {inactiveSubmitting ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showDetailsModal && selectedEmployee && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]">
          <div className="bg-white rounded-[15px] max-w-[520px] w-full max-h-[90vh] overflow-hidden px-4 py-4 relative shadow-2xl flex flex-col gap-3 font-Gantari">
            {/* Header */}
            <div className="flex items-center justify-center relative shrink-0">
              <button
                type="button"
                onClick={() => { setShowDetailsModal(false); setSelectedEmployee(null); }}
                className="absolute left-0 p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
              >
                <FiX className="w-5 h-5 font-bold" />
              </button>
              <h3 className="text-[24px] font-semibold text-[#020202]">View Details</h3>
            </div>

            {/* Profile Section: show uploaded photo if available, otherwise initials */}
            <div className="flex items-center gap-2 px-0">
              <div className="w-[38px] h-[38px] rounded-full bg-[#F4F4F4] shrink-0 overflow-hidden flex items-center justify-center">
                {selectedEmployee.profile_picture && selectedEmployee.profile_picture.trim() ? (
                  <img
                    src={getProfileUrl(selectedEmployee.profile_picture)}
                    alt={selectedEmployee.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide broken image and let initials show
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-[32px] font-bold text-[#000000]">
                    {toCamelCase(selectedEmployee.full_name).charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-[18px] font-bold text-[#000000] font-Gantari">{toCamelCase(selectedEmployee.full_name)}</h4>
                <p className="text-[14px] font-semibold text-[#353535] font-Gantari">{selectedEmployee.empid || `EMP-${String(selectedEmployee.id).padStart(4, '0')}`}</p>
              </div>
            </div>

            {/* Details Table */}
            <div className="px-4 sm:px-8 space-y-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {[
                { label: 'Date of Birth', value: selectedEmployee.dob },
                { label: 'Phone Number', value: selectedEmployee.phone_number },
                { label: 'Email ID', value: selectedEmployee.email },
                { label: 'User Type', value: selectedEmployee.user_type },
                { label: 'User Role', value: selectedEmployee.user_role },
                { label: 'Address', value: selectedEmployee.address },
                { label: 'Joined Date', value: selectedEmployee.doj },
                { label: 'Salary', value: selectedEmployee.salary },
                { label: 'Department', value: selectedEmployee.department },
                { label: 'Account Number', value: selectedEmployee.accountnumber }, 
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col sm:grid sm:grid-cols-[140px_20px_1fr] text-[15px] gap-2 sm:gap-15 pb-2 sm:pb-0 border-b sm:border-none border-[#F0F0F0] last:border-none">
                  <span className="text-[14px] font-semibold font-Gantari text-[#000000]">{item.label}</span>
                  <span className="hidden sm:inline text-[14px] font-Gantari text-[#000000] text-center">:</span>
                  <span className="text-[14px] text-[#616161] font-Gantari font-medium break-words">{item.value || 'N/A'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
