import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiGrid, FiMenu, FiChevronDown, FiX } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';
import { getPhoneLength } from '../../utils/countryCodes';

// Get API base URL for image URLs (so uploaded profile pictures load correctly)
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || '';
};

import pmprofilebg from '../../assets/ProjectManager/consultant/pmprofilebg.jpg';
import mailIcon from '../../assets/ProjectManager/consultant/mailIcon.svg';
import messageIcon from '../../assets/ProjectManager/consultant/messageIcon.svg';
import callIcon from '../../assets/ProjectManager/consultant/callIcon.svg';
import eyeIcon from '../../assets/ProjectManager/consultant/eyeIcon.svg';
import editIcon from '../../assets/ProjectManager/consultant/editIcon.svg';
import projectViewIcon from '../../assets/ProjectManager/project/viewIcon.svg';
import projectEditIcon from '../../assets/ProjectManager/project/editIcon.svg';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';

const SHOW_ENTRIES_PLACEHOLDER = 'Show Entries';
const SHOW_ENTRIES_SELECTED_PREFIX = 'Show:';
const showEntriesOptions: {
  value: string;
  label: string;
  start: number;
  end: number | null;
}[] = [
    { value: '1-50', label: '1-50', start: 0, end: 50 },
    { value: '51-100', label: '51-100', start: 50, end: 100 },
    { value: '101-150', label: '101-150', start: 100, end: 150 },
    { value: '151-200', label: '151-200', start: 150, end: 200 },
    { value: '201-250', label: '201-250', start: 200, end: 250 },
    { value: '251-300', label: '251-300', start: 250, end: 300 },
    { value: 'all', label: 'All', start: 0, end: null },
  ];
interface Employee {
  id: number;
  full_name: string;
  email: string;
  user_role?: string;
  active?: string;
  status?: string;
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

/** Names with more than 3 words may wrap to a second line; ≤3 stay on one line. */
const nameExceedsThreeWords = (displayName: string): boolean =>
  displayName.trim().split(/\s+/).filter(Boolean).length > 3;
// Fallback options; will be replaced by values loaded from backend department.name
const Departments_options = [
  'Technical', 'Sales', 'Operations', 'Human Resources', 'Accounts', 'Designing'
];
const ROLE_OPTIONS = [
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
    display: none;
  }
  .custom-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder,
  className = "",
  styleType = "form",
  alignMenu = "left",
  menuMaxHeightClass = "max-h-[220px]",
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
  styleType?: "form" | "header" | "table";
  alignMenu?: "left" | "right";
  menuMaxHeightClass?: string;
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

  const isPlaceholder = !value || value === placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 transition-all outline-none font-gantari min-w-0 ${styleType === "header"
          ? "px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold"
          : styleType === "table"
            ? `px-4 py-2 min-w-[140px] rounded-md border font-gantari font-medium text-[14px] ${value === 'Active' ? 'bg-[#E1F6EB] border-[#A7F3D0] text-[#008F22]' : 'bg-[#FFE5E5] border-[#FECACA] text-[#E00100]'}`
            : `px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] border border-transparent focus:outline-none focus:border-[#AEACAC52] ${isOpen ? "!border-[#AEACAC52]" : ""}`
          }`}
      >
        <span className={`min-w-0 flex-1 truncate overflow-hidden text-left ${styleType === "header" || styleType === "form"
          ? (isPlaceholder ? "text-[#8B8B8B]" : "text-[#353535]")
          : ""
          }`}>
          {styleType === "header" && value && !isPlaceholder ? (
            <span className="font-semibold">{toCamelCase(value)}</span>
          ) : (
            value || placeholder
          )}
        </span>
        <img
          src={ArrowDown}
          alt=""
          className={`w-4 h-4 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""} ${styleType === "table" ? "opacity-70" : (isPlaceholder ? "opacity-60 grayscale" : "opacity-90")}`}
          aria-hidden
        />
      </button>
      {isOpen && (
        <div
          className={`absolute top-full mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden ${alignMenu === "right" ? "right-0 left-auto" : "left-0"
            }`}
        >
          {styleType === "table" ? (
            <div className="flex flex-col py-2">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-6 py-2 text-[14px] font-normal font-Gantari transition-colors cursor-pointer hover:bg-[#F2F2F2] hover:text-[#353535] ${value === option ? "text-[#353535]" : "text-[#8B8B8B]"}`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className={`${menuMaxHeightClass} overflow-y-auto custom-scrollbar`}>
              {(styleType === "header" || styleType === "form") && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      (placeholder === "Show" || placeholder === "Show entries") &&
                      styleType === "header"
                    ) {
                      onChange("");
                      setIsOpen(false);
                    } else if (
                      (placeholder === "Type" || placeholder === "Status") &&
                      styleType === "header"
                    ) {
                      onChange("");
                      setIsOpen(false);
                    } else {
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer hover:text-[#353535] hover:bg-[#F2F2F2] ${isPlaceholder && placeholder !== "Show" && placeholder !== "Show entries"
                    ? "text-[#353535] bg-[#F2F2F2]"
                    : "text-[#8B8B8B] bg-[#FFFFFF]"
                    }`}
                >
                  {placeholder}
                </button>
              )}
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-[14px] font-gantari font-normal transition-colors cursor-pointer hover:text-[#353535] hover:bg-[#F2F2F2] ${value === option ? "text-[#353535] bg-[#F2F2F2]" : "text-[#8B8B8B] bg-transparent"}`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EmployeesPM() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
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
    salary: '',
    accountnumber: '',
    roles: ['Employee'],
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
    address: '',
    dob: '',
    password: '',
    user_type: 'Employee',
    doj: '',
    salary: '',
    accountnumber: '',
    profile_picture: null as File | null,
    roles: ['Employee'],
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
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedShowEntries, setSelectedShowEntries] = useState('');
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);


  const canAdd = user?.panel_type === 1;


  useEffect(() => {
    api.get<{ employees?: Employee[] }>('/api/employees').then(({ data }) => setList(data.employees ?? [])).catch(() => setList([])).finally(() => setLoading(false));
  }, []);



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (
        showEntriesOpen &&
        showEntriesDropdownRef.current &&
        !showEntriesDropdownRef.current.contains(t)
      ) {
        setShowEntriesOpen(false);
      }
    };
    if (showEntriesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEntriesOpen]);

  useEffect(() => {
    if (showEntriesOpen && showEntriesDropdownContentRef.current) {
      showEntriesDropdownContentRef.current.scrollTop = 0;
    }
  }, [showEntriesOpen]);

  const searchQueryKey = searchParams.get('q') ?? '';

  useEffect(() => {
    setTableCurrentPage(1);
  }, [selectedShowEntries, typeFilter, statusFilter, searchQueryKey]);

  const filteredList = list.filter((emp: Employee) => {
    if (typeFilter === 'Employee') {
      const currentType = (emp.user_type || '').toLowerCase();
      if (currentType !== 'employee') return false;
    } else if (typeFilter === 'Trainee') {
      const currentType = (emp.user_type || '').toLowerCase();
      if (currentType !== 'trainee') return false;
    }

    if (statusFilter === 'Active') {
      const currentStatus = (emp.active || '').toLowerCase();
      if (currentStatus !== 'active') return false;
    } else if (statusFilter === 'Inactive') {
      const currentStatus = (emp.active || '').toLowerCase();
      if (currentStatus === 'active') return false;
    }

    const searchQuery = searchQueryKey.toLowerCase();
    const matchesSearch = !searchQuery || [
      emp.full_name,
      emp.email,
      emp.user_role,
      emp.department,
      emp.phone_number
    ].some(field => (field || "").toLowerCase().includes(searchQuery));

    return matchesSearch;
  });

  const effectiveShowEntryValue =
    selectedShowEntries || showEntriesOptions[0].value;
  const selectedRange =
    showEntriesOptions.find((o) => o.value === effectiveShowEntryValue) ??
    showEntriesOptions[0];
  const rangeStart = selectedRange.start;
  const rangeEnd =
    selectedRange.end === null
      ? filteredList.length
      : Math.min(selectedRange.end, filteredList.length);
  const listInRange = filteredList.slice(rangeStart, rangeEnd);
  const totalInRange = listInRange.length;
  const tableRowsPerPage = 5;
  const tableTotalPages = Math.max(1, Math.ceil(listInRange.length / tableRowsPerPage));
  const safeTableCurrentPage = Math.min(tableCurrentPage, tableTotalPages);
  const tablePageStartIndex = (safeTableCurrentPage - 1) * tableRowsPerPage;
  const tablePageRows = listInRange.slice(tablePageStartIndex, tablePageStartIndex + tableRowsPerPage);
  const tablePageRangeStart = listInRange.length === 0 ? 0 : rangeStart + tablePageStartIndex + 1;
  const tablePageRangeEnd = listInRange.length === 0
    ? 0
    : Math.min(rangeStart + tablePageStartIndex + tableRowsPerPage, rangeEnd);
  const tablePageRangeLabel = listInRange.length === 0 ? '0-0' : `${tablePageRangeStart}-${tablePageRangeEnd}`;
  const displayedListTable = tablePageRows;
  const displayedListCard = listInRange;


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
        toast.success('Consultant updated successfully');
      })
      .catch((err) => {
        console.error('Update failed:', err);
        toast.error(err.response?.data?.message || 'Update failed');
      })
      .finally(() => setEditSubmitting(false));
  }

  function handleStatusToggle(id: number, newStatus: string) {
    const status = newStatus.toLowerCase() === 'active' ? 'active' : 'inactive';

    // Optimistic update: Update UI immediately
    setList(prev => prev.map(e => e.id === id ? { ...e, active: status } : e));

    api.post('/api/employees/bulk-status', { ids: [id], action: status }).then(() => {
      toast.success(`Status updated to ${newStatus} successfully.`);
    }).catch(() => {
      // Revert UI if API fails
      setList(prev => prev.map(e => e.id === id ? { ...e, active: status === 'active' ? 'inactive' : 'active' } : e));
      toast.error('Failed to update status.');
    });
  }

  function openEditModel(emp: Employee) {
    const parsed = parsePhone(emp.phone_number || '');
    setEditId(emp.id);
    setActiveView('edit');
    setEditForm({
      full_name: emp.full_name,
      email: emp.email,
      phone_number: parsed.phone_digits,
      country_code: parsed.country_code,
      user_role: emp.user_role || 'Consultant',
      address: emp.address || '',
      dob: emp.dob || '',
      password: '',
      user_type: emp.user_type || '',
      doj: emp.doj || '',
      salary: emp.salary || '',
      accountnumber: emp.accountnumber || '',
      profile_picture: null,
      roles: emp.Allpannel ? emp.Allpannel.split(',').map((r: string) => r.trim()) : [],
      active: emp.active === 'active' ? 'Active' : 'Inactive',
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
            type: 'Employee',
            user_role: '',
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
          toast.success('Consultant added successfully');
        } else {
          setAddError(data.message || 'Failed to add consultant.');
          toast.error(data.message || 'Failed to add consultant.');
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Failed to add consultant.';
        setAddError(msg);
        toast.error(msg);
      })
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
      <style>{SCROLLBAR_STYLE}</style>
      {activeView === 'list' && (
        <>
          <div className="sticky z-50 bg-white mb-4 mt-2 overflow-visible">
            <div className="flex w-full min-h-[44px] flex-nowrap items-center gap-2 sm:gap-3 overflow-visible">
              <h1 className="text-[24px] font-medium text-[#000000] font-Gantari shrink-0 pr-1">
                Consultants
              </h1>
              {/* Tight gap between action buttons and Show Entries / Status (inner), title spacing unchanged */}
              <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-visible">
                {/* Scroll only the action buttons — avoids clipping dropdown panels */}
                <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2 xl:overflow-visible overflow-x-auto overflow-y-visible py-1 pr-0.5 custom-scrollbar">
                  <div className="relative group inline-flex shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      aria-label="Table view"
                      className={`shrink-0 p-2 rounded-full transition-all cursor-pointer ${viewMode === 'table' ? 'bg-[#DD4342] text-[#F2F2F2]' : 'bg-[#E0E0E0] text-[#000000]'}`}
                    >
                      <FiMenu className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                      <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                      <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                        <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                          List
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="relative group inline-flex shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('card')}
                      aria-label="Card view"
                      className={`shrink-0 p-2 rounded-full transition-all cursor-pointer ${viewMode === 'card' ? 'bg-[#DD4342] text-[#F2F2F2]' : 'bg-[#E0E0E0] text-[#000000]'}`}
                    >
                      <FiGrid className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                      <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                      <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                        <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                          Grid
                        </span>
                      </div>
                    </div>
                  </div>
                  {canAdd && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveView('add')}
                        className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-[15px] font-Gantari font-semibold whitespace-nowrap cursor-pointer"
                      >
                        Add Consultant
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView('invite')}
                        className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-[15px] font-Gantari font-semibold whitespace-nowrap cursor-pointer"
                      >
                        Invite
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView('inactive')}
                        className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-[16px] font-Gantari font-semibold whitespace-nowrap cursor-pointer"
                      >
                        Manage Inactive
                      </button>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2 overflow-visible">
                  {viewMode === 'table' && (
                    <div
                      className="relative min-w-[140px] max-w-[200px] w-[150px]"
                      ref={showEntriesDropdownRef}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEntriesOpen((o) => !o);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0 min-w-0"
                      >
                        <span
                          className={`min-w-0 flex-1 truncate overflow-hidden text-left ${selectedShowEntries === ''
                            ? 'text-[#8B8B8B]'
                            : 'text-[#353535]'
                            }`}
                        >
                          {selectedShowEntries === '' ? (
                            SHOW_ENTRIES_PLACEHOLDER
                          ) : (
                            <>
                              <span className="text-[14px]">
                                {SHOW_ENTRIES_SELECTED_PREFIX}
                              </span>{' '}
                              <span className="font-semibold">
                                {selectedRange.label}
                              </span>
                            </>
                          )}
                        </span>
                        <img
                          src={ArrowDown}
                          alt=""
                          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${showEntriesOpen ? 'rotate-180' : ''
                            } ${selectedShowEntries === ''
                              ? 'opacity-60 grayscale'
                              : 'opacity-90'
                            }`}
                          aria-hidden
                        />
                      </button>
                      {showEntriesOpen && (
                        <div className="absolute top-full right-0 left-auto mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                          <div
                            ref={showEntriesDropdownContentRef}
                            className="max-h-[168px] overflow-y-auto custom-scrollbar"
                          >
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedShowEntries('');
                                setShowEntriesOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer text-[#8B8B8B] bg-[#FFFFFF] hover:text-[#353535] hover:bg-[#F2F2F2]"
                            >
                              {SHOW_ENTRIES_PLACEHOLDER}
                            </button>
                            {showEntriesOptions.map((opt) => {
                              const isChosen = selectedShowEntries === opt.value;
                              return (
                                <button
                                  key={`${opt.value}-${opt.start}-${String(opt.end)}`}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedShowEntries(opt.value);
                                    setShowEntriesOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${isChosen
                                    ? 'text-[#353535] bg-[#F2F2F2]'
                                    : 'text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]'
                                    }`}
                                >
                                  <span className="truncate min-w-0">{opt.label}</span>
                                  {isChosen && (
                                    <svg
                                      className="w-4 h-4 shrink-0 text-[#353535]"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      aria-hidden
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {viewMode === 'card' ? (
                    <CustomDropdown
                      options={['All', 'Employee', 'Trainee']}
                      value={typeFilter}
                      onChange={(val) => setTypeFilter(val)}
                      placeholder="Type"
                      className="w-[100px]"
                      styleType="header"
                      alignMenu="right"
                    />
                  ) : (
                    <CustomDropdown
                      options={['All', 'Active', 'Inactive']}
                      value={statusFilter}
                      onChange={(val) => setStatusFilter(val)}
                      placeholder="Status"
                      className="w-[100px]"
                      styleType="header"
                      alignMenu="right"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-2">
                {displayedListCard.length === 0 ? (
                  <div className="col-span-full bg-white rounded-[10px] border border-slate-200 p-8 sm:p-12 text-center text-slate-500 shadow-sm">
                    No consultants found.
                  </div>
                ) : (
                  displayedListCard.map((emp: Employee) => (
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

                        <div className="absolute top-3 right-3 z-10">
                          {emp.active !== 'active' ? (
                            <div className="flex items-center gap-1.5 px-2 rounded-full border shadow-sm bg-[#FFEEEE] border-red-100">
                              <span className="w-2 h-2 rounded-full bg-[#E00100]"></span>
                              <span className="text-[14px] font-semibold text-[#E00100]">
                                Inactive
                              </span>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-1.5 px-2 rounded-full border shadow-sm ${emp.status === 'Online' ? 'bg-[#E0FFE8] border-emerald-100' : 'bg-[#FFEEEE] border-red-100'}`}>
                              <span className={`w-2 h-2 rounded-full ${emp.status === 'Online' ? 'bg-[#166534]' : 'bg-[#E00100]'}`}></span>
                              <span className={`text-[14px] font-semibold ${emp.status === 'Online' ? 'text-[#008F22]' : 'text-[#E00100]'}`}>
                                {emp.status === 'Online' ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* User info on image: show uploaded photo if available, otherwise initials */}
                        <div className="absolute inset-x-0 bottom-0 px-3 py-3 sm:px-3 sm:py-4 flex items-center gap-4 z-10">
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
                          <div className="min-w-0 flex-1">
                            <h3
                              className={`text-[18px] sm:text-[22px] font-Gantari font-semibold text-[#F2F2F2] leading-tight tracking-tight min-w-0 ${nameExceedsThreeWords(toCamelCase(emp.full_name))
                                ? 'line-clamp-2 break-words'
                                : 'whitespace-nowrap truncate'
                                }`}
                            >
                              {toCamelCase(emp.full_name)}
                            </h3>
                            <p className="text-[14px] sm:text-[16px] text-[#F2F2F2] mt-1 truncate">
                              {emp.user_role || 'Consultant'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="px-2.5 py-4 sm:px-3 sm:py-5 space-y-4 sm:space-y-5">
                        {/* Contact Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${emp.email}`, '_blank')}
                            className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-md text-[#12141D] text-[12px] sm:text-[14px] font-medium font-Gantari cursor-pointer"
                          >
                            <img src={mailIcon} alt="Mail" className="w-4 h-4" /> Mail
                          </button>
                          <button
                            onClick={() => navigate('/chat')}
                            className="flex-[1.4] min-w-[90px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-md text-[#12141D] text-[12px] sm:text-[14px] font-medium font-Gantari cursor-pointer"
                          >
                            <img src={messageIcon} alt="Message" className="w-4 h-4" /> Message
                          </button>
                          <button
                            onClick={() => window.location.href = `tel:${emp.phone_number || ''}`}
                            className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-md text-[#12141D] text-[12px] sm:text-[14px] font-medium font-Gantari cursor-pointer"
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
                            className="flex items-center justify-center gap-2 py-2 bg-[#DD4342] text-white rounded-md text-[12px] sm:text-[14px] font-medium font-Gantari cursor-pointer"
                          >
                            <img src={eyeIcon} alt="View" className="w-4 h-4 sm:w-5 sm:h-5" /> View
                          </button>
                          {canAdd && (
                            <button
                              type="button"
                              onClick={() => openEditModel(emp)}
                              className="flex items-center justify-center gap-2 py-2 bg-[#F2F2F2] text-[#353535] rounded-md text-[12px] sm:text-[14px] font-medium font-Gantari cursor-pointer"
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
              <>
                <div className="bg-white rounded-md border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative mb-3">
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="overflow-auto h-[calc(100%+17px)] pb-[17px] [&::-webkit-scrollbar:horizontal]:!hidden">
                      <table className="min-w-full border-collapse">
                    <thead className="sticky top-0 z-20 bg-white after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                      <tr className="bg-white">
                        <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535]">
                          Sl.No
                        </th>
                        <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Emp ID</th>
                        <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white whitespace-nowrap">Consultant Name</th>
                        <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Email ID</th>
                        <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Contact Info</th>
                        <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Status</th>
                        <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {displayedListTable.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-Gantari">
                            No consultants found.
                          </td>
                        </tr>
                      ) : (
                        displayedListTable.map((emp, idx) => {
                          const baseIndex = rangeStart + tablePageStartIndex + idx;
                          const slNo = baseIndex + 1;
                          const slNoDisplay = String(slNo).padStart(2, '0');
                          return (
                            <tr key={emp.id} className={`${idx % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                              <td className="px-6 py-5 text-center text-[14px] font-Gantari text-[#6B6B6B]">
                                {slNoDisplay}
                              </td>


                              <td className="px-6 py-5 text-center text-[14px] font-Gantari text-[#6B6B6B] whitespace-nowrap">
                                {emp.empid || `EMP-${(emp.id + 150).toString().padStart(4, '0')}`}
                              </td>

                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="flex items-center justify-start gap-4">
                                  <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-200">
                                      {emp.profile_picture && emp.profile_picture.trim() ? (
                                        <img
                                          src={getProfileUrl(emp.profile_picture)}
                                          alt={emp.full_name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            const parent = target.parentElement;
                                            if (parent && !parent.querySelector('.error-placeholder')) {
                                              parent.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center error-placeholder"><span class="text-gray-400 text-[10px]">No Photo</span></div>';
                                            }
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                          <span className="text-gray-400 text-[10px]">No Photo</span>
                                        </div>
                                      )}
                                    </div>
                                    <span className={`absolute top-0 left-0 w-3 h-3 border-2 border-white rounded-full ${emp.active !== 'active' ? 'bg-[#ef4444]' : (emp.status === 'Online' ? 'bg-[#22c55e]' : 'bg-[#ef4444]')}`}></span>
                                  </div>
                                  <span className="text-[14px] font-semibold font-Gantari text-[#353535] whitespace-nowrap">
                                    {toCamelCase(emp.full_name)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-center text-[14px] font-Gantari text-[#353535]">{emp.email}</td>
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
                                    options={['Active', 'Inactive']}
                                    className="cursor-pointer"
                                    value={emp.active === 'active' ? 'Active' : 'Inactive'}
                                    onChange={(val) => handleStatusToggle(emp.id, val)}
                                    placeholder="Status"
                                    styleType="table"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-5 text-center border-b border-[#F0F0F0] whitespace-nowrap">
                                <div className="flex items-center justify-center gap-3">
                                  <div className="relative group inline-flex shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedEmployee(emp);
                                        setShowDetailsModal(true);
                                      }}
                                      aria-label="View consultant"
                                      className="flex py-2 px-2 shrink-0 items-center justify-center bg-[#DD4342] text-white rounded-md transition-all cursor-pointer"
                                    >
                                      <img src={projectViewIcon} className="w-4 h-4 brightness-0 invert" alt="" aria-hidden />
                                    </button>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                      <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                                      <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                                        <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                          View
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  {canAdd && (
                                    <div className="relative group inline-flex shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => openEditModel(emp)}
                                        aria-label="Edit consultant"
                                        className={`flex py-2 px-2 shrink-0 items-center justify-center rounded-md transition-all cursor-pointer ${idx % 2 === 1 ? "bg-[#FFFFFF]" : "bg-[#F2F2F2]"}`}
                                      >
                                        <img src={projectEditIcon} className="w-4 h-4" alt="" aria-hidden />
                                      </button>
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                        <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                                        <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                                          <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                            Edit
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                {listInRange.length > 0 && (
                <div className="w-full flex items-center justify-end mt-2">
                  <div className="flex items-center gap-4 bg-[#E8E8E8] rounded-md px-5 py-2">
                    <span className="text-[#353535] text-[16px] font-medium font-gantari leading-none">Showing:</span>
                    <button
                      type="button"
                      onClick={() => setTableCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeTableCurrentPage === 1}
                      className={`inline-flex items-center gap-1 text-[15px] font-medium font-gantari leading-none cursor-pointer ${safeTableCurrentPage === 1
                        ? 'text-[#9CA3AF] opacity-50 cursor-not-allowed'
                        : 'text-[#353535]'
                        }`}
                      aria-label="Previous page"
                    >
                      <span className="relative -top-[2px] inline-flex items-center justify-center text-[24px] leading-none">&#8249;</span>
                      <span className="inline-flex items-center">Prev</span>
                    </button>
                    <button
                      type="button"
                      className="px-4 py-1 rounded-[10px] bg-[#DD4342] text-[#FFFFFF] text-[14px] font-semibold font-gantari leading-none cursor-default"
                      aria-current="page"
                    >
                      {tablePageRangeLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableCurrentPage((p) => Math.min(tableTotalPages, p + 1))}
                      disabled={safeTableCurrentPage >= tableTotalPages}
                      className={`inline-flex items-center gap-1 text-[15px] font-medium font-gantari leading-none cursor-pointer ${safeTableCurrentPage >= tableTotalPages
                        ? 'text-[#9CA3AF] opacity-40 cursor-not-allowed'
                        : 'text-[#353535]'
                        }`}
                      aria-label="Next page"
                    >
                      <span className="inline-flex items-center">Next</span>
                      <span className="relative -top-[2px] inline-flex items-center justify-center text-[24px] leading-none">&#8250;</span>
                    </button>
                  </div>
                </div>
                )}
              </>

            )}
          </div>


        </>
      )}

      {activeView === 'add' && (
        <div className="flex-1 overflow-y-auto p-2 bg-white">
          <div className="max-w-[1174px] mx-auto">
            <div className="flex left-6 items-center justify-between mb-8 sm:mb-10 relative">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => { setActiveView('list'); setAddError(''); }}
                  className="p-2 rounded-md bg-[#F2F2F2] text-[#616161] transition-all cursor-pointer"
                >
                  <img src={backIcon} alt="Back" className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Go Back
                    </span>
                  </div>
                </div>
              </div>
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
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
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
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
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
            </div>

                {/* Column 2 */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Birth</label>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setForm((f: any) => ({ ...f, dob: e.target.value }))}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
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
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Joining</label>
                    <input
                      type="date"
                      value={form.joining_date}
                      onChange={(e) => setForm((f: any) => ({ ...f, joining_date: e.target.value }))}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[16px] font-semibold text-[#000000] font-Gantari">Upload Profile Picture</label>
                    <div className="flex items-center bg-[#F4F4F4] rounded-md overflow-hidden">
                      <div className="flex-1 px-4 text-[14px] text-[#979797] truncate">
                        {form.profile_picture ? form.profile_picture.name : 'Choose file (JPEG or JPG only)'}
                      </div>
                      <label className="px-5 py-2 bg-[#E0E0E0] text-[#353535] text-[14px] font-medium cursor-pointer transition-colors shrink-0 font-Gantari">
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
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
                />
              </div>

              {/* Panel Access Control */}
              <div className="mt-8">
                <label className="block text-[18px] font-semibold text-[#000000] mb-4 font-Gantari">Select Panel Access Control</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-4 gap-x-6 p-6 bg-[#F2F3F4] rounded-[10px]">
                  {PANEL_ACCESS_OPTIONS.map((role) => (
                    <div key={role} className="flex items-center gap-3">
                      <div
                        onClick={() => {
                          const newRoles = form.roles.includes(role)
                            ? form.roles.filter((r: string) => r !== role)
                            : [...form.roles, role];
                          setForm((f: any) => ({ ...f, roles: newRoles }));
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
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="w-full sm:w-auto px-5 py-2 rounded-md bg-[#F2F2F2] text-[#12141D] font-medium text-[16px] font-gantari cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="w-full sm:w-auto px-5 py-2 rounded-md bg-[#DBE9FE] text-[#12141D] font-medium text-[16px] font-gantari cursor-pointer"
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
            <div className="flex left-5 items-center justify-between mb-8 sm:mb-10 relative">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => { setActiveView('list'); setEditId(null); }}
                  className="p-2 rounded-md bg-[#F2F2F2] text-[#616161] transition-all cursor-pointer hover:bg-[#E8E8E8]"
                >
                  <img src={backIcon} alt="Back" className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Go Back
                    </span>
                  </div>
                </div>
              </div>
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
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52] disabled:opacity-70 disabled:cursor-not-allowed"
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
                          className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
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
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52] disabled:opacity-70 disabled:cursor-not-allowed"
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
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Account Number</label>
                    <input
                      type="text"
                      placeholder="Enter Account Number"
                      value={editForm.accountnumber}
                      onChange={(e) => setEditForm((f: any) => ({ ...f, accountnumber: e.target.value }))}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
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
                      className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
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
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52] disabled:opacity-70 disabled:cursor-not-allowed"
                      required
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Joining</label>
                    <input
                      type="date"
                      value={editForm.doj}
                      onChange={(e) => setEditForm((f: any) => ({ ...f, doj: e.target.value }))}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Salary</label>
                    <input
                      type="text"
                      placeholder="0000$"
                      value={editForm.salary}
                      onChange={(e) => setEditForm((f: any) => ({ ...f, salary: e.target.value }))}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[16px] font-semibold text-[#000000] font-Gantari">Update Profile Picture</label>
                    <div className="flex items-center bg-[#F4F4F4] rounded-md overflow-hidden">
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
                  className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-md font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
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
                        className={`w-6 h-6 rounded-[4px] border-2 flex items-center justify-center cursor-pointer transition-all ${editForm.roles.includes(role) ? 'bg-[#D1E6FF] border-[#D1E6FF]' : 'bg-white border-[#E0E0E0]'
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
                  className="w-full sm:w-auto px-5 py-2 rounded-md bg-[#F2F2F2] text-[#12141D] font-medium text-[16px] font-gantari cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="w-full sm:w-auto px-5 py-2 rounded-md bg-[#DBE9FE] text-[#12141D] font-medium text-[16px] font-gantari cursor-pointer"
                >
                  {editSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeView === 'invite' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <div className="bg-white rounded-[20px] max-w-[813px] w-full max-h-[90vh] overflow-hidden px-5 py-4 relative shadow-2xl flex flex-col font-Gantari animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center mb-6 sm:mb-2 relative shrink-0 pt-2 sm:pt-0">
              <div className="absolute left-5 group inline-flex shrink-0">
                <button
                  type="button"
                  onClick={() => { setActiveView('list'); setInviteEmails(''); setInviteMessage(''); }}
                  className="p-2.5 rounded-[5px] bg-[#F2F2F2] text-[#1A1A1A] transition-all cursor-pointer"
                >
                  <FiX className="w-5 h-5 font-bold" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px] "></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="text-[24px] font-semibold text-[#020202] text-center mb-6">Invite New Consultant</h3>
            </div>

            <form onSubmit={handleInvite} className="space-y-4 overflow-y-auto custom-scrollbar pr-2">
              <div className="px-5 space-y-4">
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-3">Email Addresses</label>
                  <textarea
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52] leading-relaxed"
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
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52] leading-relaxed"
                    placeholder="Enter your Invitation Message.,"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-14 justify-center items-center pt-4 ">
                <button
                  type="button"
                  onClick={() => { setActiveView('list'); setInviteEmails(''); setInviteMessage(''); }}
                  className="px-10 py-2 sm:py-2 rounded-md bg-[#F2F2F2] text-[#616161] font-medium text-[14px] sm:text-[14px] transition-all cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={!inviteEmails || inviteSubmitting}
                  className="px-10 py-2 sm:py-2 rounded-md bg-[#DBE9FE] text-[#353535] font-medium text-[14px] sm:text-[14px] transition-all cursor-pointer"
                >
                  {inviteSubmitting ? 'Sending...' : 'Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {activeView === 'inactive' && (
        <div className="flex-1 overflow-y-auto px-5 bg-white flex flex-col min-h-0">
          <div className="max-w-[1174px] mx-auto w-full flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-8 sm:mb-10 relative shrink-0">
              <div className="relative group inline-flex shrink-0">
                <button
                  type="button"
                  onClick={() => { setActiveView('list'); setInactiveIds([]); }}
                  className="p-2 rounded-md bg-[#F2F2F2] text-[#1A1A1A] transition-all cursor-pointer"
                >
                  <img src={backIcon} alt="Back" className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-2 py-0.5 relative z-10">
                    <span className="font-Gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Go Back
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">
                Manage Inactive Consultants
              </h3>
              <div className="w-10" />
            </div>

            <div className="shrink-0 mb-6 px-2 sm:px-4 mt-[-20px]">
              <p className="text-[14px] text-[#353535] mb-2 leading-relaxed font-medium font-Gantari">
                Select Consultants to mark as IN-Active. In-Active Consultants will not appear in Project Assignment dropdowns.
              </p>
              <p className="text-[14px] font-semibold text-[#3d3399] font-Gantari">
                {inactiveIds.length} Consultant(s) will be marked as In-Active
              </p>
            </div>

            <div className="flex-1 overflow-y-auto border border-[#E0E0E0] rounded-[15px] custom-scrollbar mb-10 bg-white">
              {(() => {
                const grouped = list.reduce((acc: Record<string, Employee[]>, emp) => {
                  const role = emp.user_role || 'General';
                  if (!acc[role]) acc[role] = [];
                  acc[role].push(emp);
                  return acc;
                }, {});

                return Object.entries(grouped).map(([role, emps]) => (
                  <div key={role} className="border-b border-[#E0E0E0] last:border-none">
                    <div className="px-6 py-4 bg-[#F9FAFB] font-semibold text-[14px] text-[#353535] border-b border-[#E0E0E0] font-Gantari">
                      {role}
                    </div>
                    <div className="divide-y divide-[#F0F0F0]">
                      {emps.map((emp) => (
                        <div
                          key={emp.id}
                          className="flex items-center justify-between px-6 py-4 hover:bg-[#F9FAFB]/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              onClick={() => setInactiveIds((prev) => (prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]))}
                              className={`w-5 h-5 rounded-[4px] border-2 cursor-pointer flex items-center justify-center shrink-0 transition-all ${inactiveIds.includes(emp.id) ? 'bg-[#D1E6FF] border-[#D1E6FF]' : 'bg-white border-[#E0E0E0]'}`}
                            >
                              {inactiveIds.includes(emp.id) && (
                                <svg width="11" height="9" viewBox="0 0 14 11" fill="none" className="shrink-0" aria-hidden>
                                  <path d="M1 5L5 9L13 1" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <span className="text-[14px] font-semibold text-[#6B6B6B] font-Gantari">
                              {emp.full_name} {emp.empid ? `(${emp.empid})` : `(EMP-${(emp.id + 150).toString().padStart(4, '0')})`}
                            </span>
                          </div>
                          {(emp.active === 'inactive' || emp.active === 'deactive') && (
                            <span className="px-4 py-1.5 bg-[#FFE6E6] text-[#E00100] text-[12px] font-semibold rounded-[5px] shrink-0 font-Gantari">
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

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center shrink-0">
              <button
                type="button"
                onClick={() => { setActiveView('list'); setInactiveIds([]); }}
                className=" px-6 py-2 sm:py-2 rounded-md bg-[#F2F2F2] text-[#616161] font-medium text-[14px] sm:text-[14px] transition-all cursor-pointer font-Gantari"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleInactive}
                disabled={!inactiveIds.length || inactiveSubmitting}
                className="px-6 py-2 sm:py-2 rounded-md bg-[#DBE9FE] text-[#353535] font-medium text-[14px] sm:text-[14px] disabled:opacity-50 transition-all cursor-pointer font-Gantari"
              >
                {inactiveSubmitting ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedEmployee && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]">
          <div className="bg-white rounded-lg max-w-[520px] w-full overflow-hidden px-[20px] py-[20px] relative shadow-2xl flex flex-col gap-6 font-Gantari">
            {/* Header */}
            <div className="flex items-center justify-center relative shrink-0">
              <div className="relative group inline-flex shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowDetailsModal(false); setSelectedEmployee(null); }}
                  className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer hover:bg-[#E8E8E8]"
                >
                  <FiX className="w-5 h-5 font-bold" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="text-[24px] font-semibold text-[#000000] font-Gantari flex-1 text-center">View Details</h3>
            </div>

            {/* Profile Section */}
            <div className="flex items-center gap-4 px-4 ">
              <div className="w-[38px] h-[38px] rounded-full overflow-hidden bg-[#F4F4F4] shrink-0">
                {selectedEmployee.profile_picture && selectedEmployee.profile_picture.trim() ? (
                  <img
                    src={getProfileUrl(selectedEmployee.profile_picture)}
                    alt={selectedEmployee.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.error-placeholder')) {
                        parent.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center error-placeholder"><span class="text-gray-400 text-sm">No Photo</span></div>';
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No Photo</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <h4 className="text-[18px] font-bold text-[#000000] font-Gantari">{toCamelCase(selectedEmployee.full_name)}</h4>
                <p className="text-[14px] font-semibold text-[#353535] font-Gantari">{selectedEmployee.empid || `EMP-${String(selectedEmployee.id).padStart(4, '0')}`}</p>
              </div>
            </div>

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
                <div
                  key={idx}
                  className="flex flex-col sm:grid sm:grid-cols-[140px_20px_1fr] text-[14px] gap-2 sm:gap-15 pb-2 sm:pb-0 border-b sm:border-none border-[#F0F0F0] last:border-none"
                >
                  <span className="text-[14px] font-Gantari text-[#020202]">{item.label}</span>
                  <span className="hidden sm:inline text-[14px] font-Gantari text-[#020202] text-center">:</span>
                  <span className="text-[14px] text-[#616161] font-Gantari break-words">{item.value || 'N/A'}</span>
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
