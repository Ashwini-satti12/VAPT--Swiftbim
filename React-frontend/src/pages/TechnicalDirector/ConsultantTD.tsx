import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiPlus, FiGrid, FiMenu, FiChevronDown, FiX } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

// Get API base URL for image URLs
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

const getProfileUrl = (path: string | undefined): string => {
  if (!path || path.trim() === "") return "";
  if (path.startsWith("http")) return path;
  
  // Normalize path separators
  let normalizedPath = path.replace(/\\/g, "/").trim();
  
  // Remove leading numbers and spaces (e.g., "1 WhatsApp Image..." or "0 anu.jpg" -> "WhatsApp Image..." or "anu.jpg")
  normalizedPath = normalizedPath.replace(/^\d+\s+/, "");
  
  // Remove leading slashes if any
  normalizedPath = normalizedPath.replace(/^\/+/, "");
  
  // Get API base URL
  const apiBaseUrl = getApiBaseUrl();
  
  // Build the full URL path
  let urlPath = "";
  
  // If path already starts with "employee/", use it directly
  if (normalizedPath.startsWith("employee/")) {
    // URL encode the path parts to handle spaces and special characters
    const parts = normalizedPath.split("/");
    const encodedParts = parts.map((part, index) => 
      index === 0 ? part : encodeURIComponent(part)
    );
    urlPath = `/uploads/${encodedParts.join("/")}`;
  }
  // If path starts with "profiles/", redirect to employee folder instead
  else if (normalizedPath.startsWith("profiles/")) {
    const filename = normalizedPath.replace("profiles/", "");
    // URL encode filename to handle spaces and special characters
    urlPath = `/uploads/employee/${encodeURIComponent(filename)}`;
  }
  // If path doesn't include a subfolder, assume it's in employee folder
  // This handles cases like "anu.jpg", "suman photo.jpg", "WhatsApp Image 2024-06-24 at 3.15.30 PM.jpeg"
  else if (!normalizedPath.includes("/")) {
    // URL encode the filename to handle spaces and special characters
    urlPath = `/uploads/employee/${encodeURIComponent(normalizedPath)}`;
  }
  // If path has other subfolders, encode each part
  else {
    const parts = normalizedPath.split("/");
    const encodedParts = parts.map((part, index) => 
      index === 0 ? part : encodeURIComponent(part)
    );
    urlPath = `/uploads/${encodedParts.join("/")}`;
  }
  
  // Combine API base URL with the path
  // Remove trailing slash from base URL if present, and ensure path starts with /
  const base = apiBaseUrl.replace(/\/$/, "");
  
  // If base URL is empty, use relative path (works if frontend and backend are on same domain)
  if (!base) {
    return urlPath;
  }
  
  return `${base}${urlPath}`;
};

const toCamelCase = (str: string): string => {
  if (!str) return str;
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};
// These will be loaded from the database (kept for backward compatibility if needed)
const ROLE_OPTIONS: string[] = [];

const PANEL_ACCESS_OPTIONS = [
  'Management',
  'Accounts',
  'Technical Director',
  'Admin',
  'Project Manager',
  'Client',
  'Sales',
  'BIM Lead',
  'BIM Coordinator',
  'Employee',
  'All',
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
        className={`w-full flex items-center justify-between transition-all outline-none font-Gantari ${
          styleType === "header" 
          ? "px-4 py-1.5 bg-[#F2F2F2] rounded-[10px] text-[#616161] text-[14px] font-semibold" 
          : styleType === "table"
          ? `px-4 py-2.5 min-w-[140px] rounded-[5px] border font-bold text-[14px] ${value === 'Active' ? 'bg-[#E0FFE8] border-[#A7F3D0] text-[#008F22]' : 'bg-[#FFEEEE] border-[#FECACA] text-[#E00100]'}`
          : `px-4 py-2 bg-[#F2F3F4] rounded-[5px] text-[14px] border border-transparent focus:outline-none focus:border-[#AEACAC52] ${isOpen ? "!border-[#AEACAC52]" : ""}`
        }`}
      >
        <span className={styleType === "form" ? (value ? "text-[#353535]" : "text-[#8B8B8B]") : ""}>{value || placeholder}</span>
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
                className="w-full text-left px-4 py-2.5 text-[14px] text-[#8B8B8B] font-Gantari hover:text-[#353535] hover:bg-[#F4F4F4] transition-colors"
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

export default function ConsultantTD() {
  const navigate = useNavigate();
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = SCROLLBAR_STYLE;
    document.head.appendChild(styleTag);
    return () => { document.head.removeChild(styleTag); };
  }, []);

  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'list' | 'add' | 'edit' | 'invite' | 'deactive'>('list');
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    dob: '',
    phone_number: '',
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
  const [deactiveIds, setdeactiveIds] = useState<number[]>([]);
  const [deactiveSubmitting, setdeactiveSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
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
    roles: [] as string[],
    active: 'Active',
  });
  const [currentProfilePicture, setCurrentProfilePicture] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);

  const canAdd = user?.panel_type === 1;

  // Fetch roles and departments from database
  useEffect(() => {
    // Fetch roles
    api.get<{ roles?: string[] }>('/api/employees/roles')
      .then(({ data }) => {
        if (data.roles && Array.isArray(data.roles)) {
          // Ensure each role name appears only once (case-insensitive)
          const map = new Map<string, string>();
          data.roles
            .filter(Boolean)
            .forEach((name) => {
              const trimmed = name.trim();
              if (!trimmed) return;
              const key = trimmed.toLowerCase();
              if (!map.has(key)) {
                // Keep the first occurrence's casing
                map.set(key, trimmed);
              }
            });
          setRoleOptions(Array.from(map.values()));
        }
      })
      .catch((err) => {
        console.error('Failed to load roles:', err);
        // Fallback to empty array
        setRoleOptions([]);
      });

    // Fetch departments
    api.get<{ departments?: string[] }>('/api/departments')
      .then(({ data }) => {
        if (data.departments && Array.isArray(data.departments)) {
          // Ensure each department name appears only once (case-insensitive)
          const map = new Map<string, string>();
          data.departments
            .filter(Boolean)
            .forEach((name) => {
              const trimmed = name.trim();
              if (!trimmed) return;
              const key = trimmed.toLowerCase();
              if (!map.has(key)) {
                map.set(key, trimmed);
              }
            });
          setDepartmentOptions(Array.from(map.values()));
        }
      })
      .catch((err) => {
        console.error('Failed to load departments:', err);
        // Fallback to empty array
        setDepartmentOptions([]);
      });
  }, []);

  useEffect(() => {
    api.get<{ employees?: Employee[] }>('/api/employees').then(({ data }) => {
      const employees = data.employees ?? [];
      // Normalize status: backend may return 'inactive', but frontend uses 'deactive'
      const normalizedEmployees = employees.map(emp => ({
        ...emp,
        active: emp.active === 'inactive' ? 'deactive' : (emp.active || 'active')
      }));
      
      // Debug: Check what profile_picture values we're getting
      console.log('=== EMPLOYEES API RESPONSE ===');
      console.log('Total employees:', normalizedEmployees.length);
      const apiBase = getApiBaseUrl();
      console.log('API Base URL:', apiBase || '(empty - using relative URLs with Vite proxy)');
      
      if (!apiBase) {
        console.log('ℹ️ Note: Vite proxy should forward /uploads/* to http://localhost:5000');
        console.log('ℹ️ If images fail, make sure dev server was restarted after vite.config.ts changes');
      }
      
      // Log first few employees with profile pictures
      const withPics = normalizedEmployees.filter(emp => emp.profile_picture);
      const withoutPics = normalizedEmployees.filter(emp => !emp.profile_picture);
      
      console.log(`Employees WITH profile_picture: ${withPics.length}`);
      console.log(`Employees WITHOUT profile_picture: ${withoutPics.length}`);
      
      withPics.slice(0, 5).forEach(emp => {
        const url = getProfileUrl(emp.profile_picture);
        console.log(`✓ ${emp.full_name}:`, {
          dbValue: emp.profile_picture,
          generatedUrl: url,
          willLoad: url ? 'YES' : 'NO'
        });
      });
      
      if (withoutPics.length > 0) {
        console.log('Employees without profile_picture:', withoutPics.slice(0, 3).map(e => e.full_name).join(', '));
      }
      
      setList(normalizedEmployees);
    }).catch((err) => {
      console.error('Failed to load employees:', err);
      setList([]);
    }).finally(() => setLoading(false));
  }, []);

  const editParam = searchParams.get('edit');
  useEffect(() => {
    if (editParam && list.length) {
      const id = parseInt(editParam, 10);
      const emp = list.find((e) => e.id === id);
      if (emp) {
        setEditId(id);
        setActiveView('edit');
        // Store current profile picture URL for display
        const currentPicUrl = emp.profile_picture ? getProfileUrl(emp.profile_picture) : null;
        setCurrentProfilePicture(currentPicUrl);
        setEditForm({
          full_name: emp.full_name,
          email: emp.email,
          phone_number: emp.phone_number || '',
          user_role: emp.user_role || '',
          department: emp.department || '',
          address: emp.address || '',
          dob: emp.dob || '',
          password: '',
          user_type: emp.user_type || '',
          doj: emp.doj || '',
          salary: emp.salary || '',
          accountnumber: emp.accountnumber || '',
          profile_picture: null,
          roles: emp.Allpannel ? emp.Allpannel.split(',').map(r => r.trim()) : [],
          active: emp.active === 'active' ? 'Active' : 'Deactivate',
        });
      }
    }
  }, [editParam, list]);

  const filteredList = list.filter((emp: Employee) => {
    if (statusFilter === 'All') return true;
    const currentStatus = (emp.active || '').toLowerCase();
    if (statusFilter === 'Active') return currentStatus === 'active';
    if (statusFilter === 'deactive') return currentStatus !== 'active';
    return true;
  });

  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);

  function exportCsv() {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Phone', 'Department'];
    const rows = list.map((e) => [e.full_name, e.email, e.user_role || '', e.active || '', e.phone_number || '', e.department || ''].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
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

  function handledeactive() {
    if (!deactiveIds.length) return;
    setdeactiveSubmitting(true);
    // Backend expects 'inactive', not 'deactive'
    api.post('/api/employees/bulk-status', { ids: deactiveIds, action: 'inactive' })
      .then((response) => {
        if (response.data?.success) {
          // Update UI with 'deactive' (frontend display format)
          setList((prev) => prev.map((e) => (deactiveIds.includes(e.id) ? { ...e, active: 'deactive' } : e)));
          setActiveView('list');
          setdeactiveIds([]);
        } else {
          console.error('Failed to deactivate employees:', response.data?.message);
          alert(`Failed to deactivate employees: ${response.data?.message || 'Unknown error'}`);
        }
      })
      .catch((err) => {
        console.error('Failed to deactivate employees:', err);
        alert(`Failed to deactivate employees: ${err.response?.data?.message || err.message || 'Network error'}`);
      })
      .finally(() => setdeactiveSubmitting(false));
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditSubmitting(true);

    const hasNewFile = !!editForm.profile_picture;

    // If user selected a new profile picture, send multipart/form-data
    if (hasNewFile) {
      const formData = new FormData();
      formData.append('full_name', editForm.full_name);
      formData.append('email', editForm.email);
      if (editForm.phone_number) formData.append('phone_number', editForm.phone_number);
      if (editForm.user_role) formData.append('user_role', editForm.user_role);
      if (editForm.department) formData.append('department', editForm.department);
      if (editForm.address) formData.append('address', editForm.address);
      if (editForm.dob) formData.append('dob', editForm.dob);
      if (editForm.doj) formData.append('doj', editForm.doj);
      if (editForm.salary) formData.append('salary', editForm.salary);
      if (editForm.accountnumber) formData.append('accountnumber', editForm.accountnumber);
      if (editForm.user_type) formData.append('user_type', editForm.user_type);
      if (editForm.roles.length) formData.append('roles', editForm.roles.join(','));
      // Password is disabled in edit mode - not sent to backend
      // Backend expects 'active' or 'inactive', not 'deactive'
      if (editForm.active) formData.append('active', editForm.active === 'Active' ? 'active' : 'inactive');
      if (editForm.profile_picture) formData.append('profile_picture', editForm.profile_picture);

      api
        .patch<{ success: boolean; profile_picture?: string | null }>(
          `/api/employees/${editId}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
        .then(({ data }) => {
          const newPic = data.profile_picture || undefined;
          setList((prev) =>
            prev.map((e) => {
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
                  Allpannel: editForm.roles.join(','),
                  // Backend returns 'inactive', but frontend displays as 'deactive'
                  active: editForm.active === 'Active' ? 'active' : 'deactive',
                  profile_picture: newPic ?? e.profile_picture,
                };
              }
              return e;
            })
          );
          setEditId(null);
          setActiveView('list');
          setSearchParams({});
        })
        .catch((err) => {
          console.error('Update failed:', err);
        })
        .finally(() => setEditSubmitting(false));
    } else {
      // No new file: send JSON payload
      const payload = {
        full_name: editForm.full_name,
        email: editForm.email,
        phone_number: editForm.phone_number || undefined,
        user_role: editForm.user_role,
        department: editForm.department || undefined,
        address: editForm.address || undefined,
        dob: editForm.dob || undefined,
        doj: editForm.doj || undefined,
        salary: editForm.salary || undefined,
        accountnumber: editForm.accountnumber || undefined,
        user_type: editForm.user_type || undefined,
        Allpannel: editForm.roles.join(','),
        // Backend expects 'active' or 'inactive', not 'deactive'
        active: editForm.active === 'Active' ? 'active' : 'inactive',
        // Password is disabled in edit mode - not sent to backend
      };

      api
        .patch(`/api/employees/${editId}`, payload)
        .then(() => {
          setList((prev) =>
            prev.map((e) => {
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
                  // Backend returns 'inactive', but frontend displays as 'deactive'
                  active: editForm.active === 'Active' ? 'active' : 'deactive',
                };
              }
              return e;
            })
          );
          setEditId(null);
          setActiveView('list');
          setSearchParams({});
        })
        .catch((err) => {
          console.error('Update failed:', err);
        })
        .finally(() => setEditSubmitting(false));
    }
  }

  function handleStatusToggle(id: number, newStatus: string) {
    // Backend expects 'active' or 'inactive', but frontend uses 'deactive' for display
    // Map: 'Active' -> 'active', 'Deactivate' -> 'inactive'
    const backendStatus = newStatus.toLowerCase() === 'active' ? 'active' : 'inactive';
    // Frontend uses 'active' or 'deactive' for display
    const frontendStatus = newStatus.toLowerCase() === 'active' ? 'active' : 'deactive';
    
    // Store previous state for rollback on error
    const previousList = [...list];
    
    // Optimistic UI update – change immediately
    setList(prev => prev.map(e => e.id === id ? { ...e, active: frontendStatus } : e));

    api.post('/api/employees/bulk-status', { ids: [id], action: backendStatus })
      .then((response) => {
        if (response.data?.success) {
          // Success - ensure UI matches (backend uses 'inactive', we display as 'deactive')
          setList(prev => prev.map(e => {
            if (e.id === id) {
              return { ...e, active: frontendStatus };
            }
            return e;
          }));
        } else {
          // API returned failure - revert to previous state
          setList(previousList);
          console.error('Status update failed:', response.data?.message || 'Unknown error');
          alert(`Failed to update status: ${response.data?.message || 'Unknown error'}`);
        }
      })
      .catch((err) => {
        console.error('Failed to update status:', err);
        // Revert to previous state on error
        setList(previousList);
        // Show error message to user
        alert(`Failed to update status: ${err.response?.data?.message || err.message || 'Network error'}`);
      });
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setAddError('Name, email and password are required.');
      return;
    }
    setAddSubmitting(true);

    // Build multipart form data so backend receives profile_picture file
    const formData = new FormData();
    formData.append('full_name', form.full_name.trim());
    formData.append('email', form.email.trim());
    formData.append('password', form.password);
    if (form.phone_number.trim()) formData.append('phone_number', form.phone_number.trim());
    if (form.user_role) formData.append('user_role', form.user_role);
    if (form.address.trim()) formData.append('address', form.address.trim());
    if (form.dob) formData.append('dob', form.dob);
    if (form.type) formData.append('user_type', form.type);
    if (form.joining_date) formData.append('doj', form.joining_date);
    if (form.department) formData.append('department', form.department);
    if (form.roles.length) formData.append('roles', form.roles.join(','));
    // Backend expects 'active' or 'inactive', not 'deactive'
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
              department: form.department,
              // Backend returns 'inactive', but frontend displays as 'deactive'
              active: form.active === 'Active' ? 'active' : 'deactive',
              dob: form.dob,
              user_type: form.type,
              doj: form.joining_date,
              address: form.address,
              salary: form.salary,
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
      {(activeView === 'list' || activeView === 'invite' || activeView === 'deactive') && (
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
                    className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap"
                  >
                    <FiPlus className="w-[18px] h-[18px] sm:w-[24px] sm:h-[24px]" />
                    Add Consultant
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('invite')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap"
                  >
                    <FiPlus className="w-[18px] h-[18px] sm:w-[24px] sm:h-[24px]" />
                    Invite
                  </button>
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap"
                  >
                    <img src={exportIcon} alt="Export" className="w-[18px] h-[18px] sm:w-[24px] sm:h-[24px]" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('deactive')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap"
                  >
                    Manage deactive
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
                  className={`p-2 rounded-full transition-all ${viewMode === 'table' ? 'bg-[#DD4342] text-[#F2F2F2]' : 'bg-[#E0E0E0] text-[#000000]'}`}
                >
                  <FiMenu className="w-5 h-5 sm:w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded-full transition-all ${viewMode === 'card' ? 'bg-[#DD4342] text-[#F2F2F2]' : 'bg-[#E0E0E0] text-[#000000]'}`}
                >
                  <FiGrid className="w-5 h-5 sm:w-6 h-6" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
                {viewMode === 'table' && (
                  <CustomDropdown
                    options={['10', '20', '30', '40']}
                    value={`Show: ${itemsPerPage}`}
                    onChange={(val) => {
                      setItemsPerPage(parseInt(val, 10));
                      setCurrentPage(1);
                    }}
                    placeholder="Show"
                    className="flex-1 sm:min-w-[120px]"
                    styleType="header"
                  />
                )}
                <CustomDropdown
                  options={viewMode === 'card' ? ['All', 'Active', 'Deactivate'] : ['All', 'Active', 'deactive']}
                  value={
                    statusFilter === 'All' 
                      ? 'Status' 
                      : statusFilter
                  }
                  onChange={(val) => {
                    let nextStatus = val;
                    if (viewMode === 'card') {
                      if (val === 'Deactivate') nextStatus = 'deactive';
                    }
                    setStatusFilter(nextStatus);
                    setCurrentPage(1);
                  }}
                  placeholder="Status"
                  className="flex-1 sm:min-w-[120px]"
                  styleType="header"
                />
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 p-4 sm:p-6">
            {filteredList.length === 0 ? (
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
                          {emp.active === 'active' ? 'Active' : 'Deactivate'}
                        </span>
                      </div>
                    </div>
                    {/* User Profile Info on Image */}
                    <div className="absolute inset-x-0 bottom-0 p-4 flex items-center gap-4 z-10">
                      <div className="w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-white overflow-hidden shrink-0 border-2 border-white shadow-sm">
                        {emp.profile_picture && emp.profile_picture.trim() ? (
                          <img
                            key={`${emp.id}-${emp.profile_picture}`}
                            src={getProfileUrl(emp.profile_picture)}
                            alt={emp.full_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const url = getProfileUrl(emp.profile_picture);
                              console.error(`❌ Failed to load image for ${emp.full_name}:`, {
                                attemptedUrl: target.src,
                                generatedUrl: url,
                                dbValue: emp.profile_picture,
                                apiBaseUrl: getApiBaseUrl(),
                                note: 'Check if file exists in backend/uploads/employee/ folder'
                              });
                              // Replace with placeholder on error
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.error-placeholder')) {
                                parent.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center error-placeholder"><span class="text-gray-400 text-xs">No Photo</span></div>';
                              }
                            }}
                            onLoad={() => {
                              console.log(`✅ Successfully loaded image for ${emp.full_name}:`, getProfileUrl(emp.profile_picture));
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Photo</span>
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
                        className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[12px] sm:text-[13px] font-semibold font-Gantari"
                      >
                        <img src={mailIcon} alt="Mail" className="w-4 h-4" /> Mail
                      </button>
                      <button 
                        onClick={() => navigate('/chat')}
                        className="flex-[1.4] min-w-[90px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[12px] sm:text-[13px] font-semibold font-Gantari"
                      >
                        <img src={messageIcon} alt="Message" className="w-4 h-4" /> Message
                      </button>
                      <button 
                        onClick={() => window.location.href = `tel:${emp.phone_number || ''}`}
                        className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[12px] sm:text-[13px] font-semibold font-Gantari"
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
                        className="flex items-center justify-center gap-2 py-2 bg-[#DD4342] text-white rounded-[5px] text-[13px] sm:text-[14px] font-Gantari"
                      >
                        <img src={eyeIcon} alt="View" className="w-4 h-4 sm:w-5 sm:h-5" /> View
                      </button>
                      {canAdd && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(emp.id);
                            setActiveView('edit');
                            // Store current profile picture URL for display
                            const currentPicUrl = emp.profile_picture ? getProfileUrl(emp.profile_picture) : null;
                            setCurrentProfilePicture(currentPicUrl);
                            setEditForm({
                              full_name: emp.full_name,
                              email: emp.email,
                              phone_number: emp.phone_number || '',
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
                          className="flex items-center justify-center gap-2 py-2 bg-[#F2F2F2] text-[#353535] rounded-[5px] text-[13px] sm:text-[14px] font-Gantari"
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
                    <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Sl No</th>
                    <th className="px-4 py-4 text-left text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Emp ID</th>
                    <th className="px-4 py-4 text-left text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Consultant Name</th>
                    <th className="px-4 py-4 text-left text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Email ID</th>
                    <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Contact Info</th>
                    <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-Gantari">
                        No consultants found.
                      </td>
                    </tr>
                  ) : (
                    paginatedList.map((emp, idx) => {
                      const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                      return (
                        <tr key={emp.id} className={`${idx % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                          <td className="px-6 py-5 text-center text-[15px] font-semibold font-Gantari text-[#6B6B6B]">
                            {serialNumber}
                          </td>
                          <td className="px-6 py-5 text-left text-[15px] font-semibold font-Gantari text-[#6B6B6B]">
                            {emp.empid || `EMP-${(emp.id + 150).toString().padStart(4, '0')}`}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="relative shrink-0">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-200">
                                  {emp.profile_picture && emp.profile_picture.trim() ? (
                                    <img
                                      key={`table-${emp.id}-${emp.profile_picture}`}
                                      src={getProfileUrl(emp.profile_picture)}
                                      alt={emp.full_name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        console.error(`❌ Failed to load image for ${emp.full_name}:`, {
                                          attemptedUrl: target.src,
                                          generatedUrl: getProfileUrl(emp.profile_picture),
                                          dbValue: emp.profile_picture
                                        });
                                        // Replace with placeholder on error
                                        const parent = target.parentElement;
                                        if (parent && !parent.querySelector('.error-placeholder')) {
                                          parent.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center error-placeholder"><span class="text-gray-400 text-[10px]">No Photo</span></div>';
                                        }
                                      }}
                                      onLoad={() => {
                                        console.log(`✅ Successfully loaded image for ${emp.full_name}:`, getProfileUrl(emp.profile_picture));
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                      <span className="text-gray-400 text-[10px]">No Photo</span>
                                    </div>
                                  )}
                                </div>
                                <span className={`absolute top-0 left-0 w-3 h-3 border-2 border-white rounded-full ${emp.active === 'active' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}></span>
                              </div>
                              <span className="text-[16px] font-semibold font-Gantari text-[#353535]">{toCamelCase(emp.full_name)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-left text-[15px] font-medium font-Gantari text-[#353535]">{emp.email}</td>
                          <td className="px-6 py-5 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <button 
                                onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${emp.email}`, '_blank')}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] transition-colors"
                              >
                                <img src={mailIcon} className="w-5 h-5" alt="Mail" />
                              </button>
                              <button 
                                onClick={() => navigate('/chat')}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] transition-colors"
                              >
                                <img src={messageIcon} className="w-5 h-5" alt="Message" />
                              </button>
                              <button 
                                onClick={() => window.location.href = `tel:${emp.phone_number || ''}`}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] transition-colors"
                              >
                                <img src={callIcon} className="w-5 h-5" alt="Call" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <div className="inline-block min-w-[140px]">
                              <CustomDropdown
                                options={['Active', 'Deactivate']}
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
          </div>
        )}
      </div>

      {/* Pagination Bottom Bar */}
      {viewMode === 'table' && (
        <div className="sticky bottom-0 z-50 bg-white py-4 sm:py-6 mt-auto">
          <div className="flex justify-center sm:justify-end sm:pr-8">
            <div className="flex flex-wrap items-center justify-center bg-[#F2F2F2] rounded-2xl sm:rounded-full p-1.5 shadow-sm gap-2">
              <span className="hidden sm:inline px-4 text-[14px] font-semibold text-[#6B6B6B] font-Gantari">Showing:</span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 text-[14px] font-semibold text-[#353535] hover:text-[#DD4342] transition-colors disabled:opacity-30 font-Gantari"
              >
                <FiChevronDown className="w-5 h-5 rotate-90" />
                Prev
              </button>

              <div className="flex items-center gap-1.5 px-2">
                {(() => {
                  const maxVisible = 4;
                  let start = Math.max(1, currentPage - 1);
                  let end = Math.min(totalPages, start + maxVisible - 1);
                  if (end - start + 1 < maxVisible) {
                    start = Math.max(1, end - maxVisible + 1);
                  }
                  const pages = [];
                  for (let i = start; i <= end; i++) pages.push(i);

                  return pages.map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-5 py-2 text-[14px] font-bold rounded-full transition-all font-Gantari ${currentPage === page ? 'text-white bg-[#DD4342] shadow-md' : 'text-[#6B6B6B] hover:bg-white'}`}
                    >
                      {(page - 1) * itemsPerPage + 1}-{Math.min(page * itemsPerPage, filteredList.length)}
                    </button>
                  ));
                })()}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="flex items-center gap-1 px-4 py-2 text-[14px] font-semibold text-[#353535]"
              >
                Next
                <FiChevronDown className="w-5 h-5 -rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {activeView === 'add' && (
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="max-w-[1174px] mx-auto">
            <div className="flex items-center justify-between mb-8 sm:mb-10 relative">
              <button
                type="button"
                onClick={() => { setActiveView('list'); setAddError(''); }}
                className="p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all"
              >
                <FiX className="w-5 h-5 font-bold" />
              </button>
              <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">Add New Consultant</h3>
              <div className="w-10" /> {/* Spacer to center title */}
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-6">
              {addError && (
                <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold">
                    !
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold leading-snug">Validation error</p>
                    <p className="mt-0.5 text-[13px] leading-snug">
                      {addError}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                {/* Column 1 */}
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
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Phone Number <span className="text-[#DD4342]">*</span></label>
                    <input
                      type="text"
                      placeholder="Enter Phone Number"
                      value={form.phone_number}
                      onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                      className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    />
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

                {/* Column 2 */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Birth <span className="text-[#DD4342]">*</span></label>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
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
                      options={['Trainee', 'Consultant',]}
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
                  <div className="space-y-2">
                    <label className="block text-[16px] font-semibold text-[#000000] font-Gantari">Upload Profile Picture</label>
                    <div className="flex items-center bg-[#F4F4F4] rounded-lg overflow-hidden">
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

              {/* Address Field */}
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
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8  ">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-semibold text-[16px] transition-all font-Gantari min-w-[160px]"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] disabled:opacity-50 transition-all font-Gantari min-w-[160px]"
                >
                  {addSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeView === 'edit' && (
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="max-w-[1174px] mx-auto">
            <div className="flex items-center justify-between mb-8 sm:mb-10 relative">
              <button
                type="button"
                onClick={() => { setActiveView('list'); setEditId(null); setSearchParams({}); }}
                className="p-2 rounded-lg bg-[#F2F2F2] text-[#616161] transition-all"
              >
                <FiX className="w-5 h-5 font-bold" />
              </button>
              <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">Edit Details</h3>
              <div className="w-10" /> {/* Spacer to center title */}
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                {/* Column 1 */}
                <div className="space-y-5">
                <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Full Name <span className="text-[#DD4342]">*</span></label>
                  <input
                    type="text"
                      placeholder="Enter Employee Name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                    disabled
                    className="w-full px-4 py-3 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#E0E0E0] border-2 border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52] cursor-not-allowed opacity-70"
                    required
                  />
                </div>
                <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Phone Number <span className="text-[#DD4342]">*</span></label>
                  <input
                      type="text"
                      placeholder="Enter Phone Number"
                      value={editForm.phone_number}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone_number: e.target.value }))}
                      className="w-full px-4 py-3 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-2 border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
                <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Password <span className="text-[#DD4342]">*</span></label>
                    <input
                      type="password"
                      placeholder="Password cannot be changed here"
                      value="********"
                      disabled
                      className="w-full px-4 py-3 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#E0E0E0] border-2 border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52] cursor-not-allowed opacity-70"
                    />
                    <p className="text-[12px] text-[#666666] mt-1 font-Gantari">Password is encrypted and cannot be viewed or edited here</p>
                  </div>
                  <div className="relative">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Role <span className="text-[#DD4342]">*</span></label>
                    <CustomDropdown
                      options={roleOptions.length > 0 ? roleOptions : ROLE_OPTIONS}
                      value={editForm.user_role}
                      onChange={(val) => setEditForm((f) => ({ ...f, user_role: val }))}
                      placeholder="Select Role"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Department <span className="text-[#DD4342]">*</span></label>
                    <CustomDropdown
                      options={departmentOptions}
                      value={editForm.department}
                      onChange={(val) => setEditForm((f) => ({ ...f, department: val }))}
                      placeholder="Select Department"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Account Number <span className="text-[#DD4342]">*</span></label>
                  <input
                    type="text"
                      placeholder="Enter Account Number"
                      value={editForm.accountnumber}
                      onChange={(e) => setEditForm((f) => ({ ...f, accountnumber: e.target.value }))}
                    className="w-full px-4 py-3 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-2 border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-5">
                <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Birth <span className="text-[#DD4342]">*</span></label>
                    <input
                      type="date"
                      value={editForm.dob}
                      onChange={(e) => setEditForm((f) => ({ ...f, dob: e.target.value }))}
                      className="w-full px-4 py-3 text-[14px] text-[#353535] bg-[#F2F3F4] border-2 border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Email ID <span className="text-[#DD4342]">*</span></label>
                  <input
                    type="email"
                    placeholder="Enter Email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-2 border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                    required
                  />
                </div>
                <div className="relative">
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Type <span className="text-[#DD4342]">*</span></label>
                  <CustomDropdown
                    options={['Trainee', 'Consultant', ]}
                    value={editForm.user_type}
                    onChange={(val) => setEditForm((f) => ({ ...f, user_type: val }))}
                    placeholder="Select Type"
                  />
                </div>
                <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Joining <span className="text-[#DD4342]">*</span></label>
                  <input
                    type="date"
                    value={editForm.doj}
                    onChange={(e) => setEditForm((f) => ({ ...f, doj: e.target.value }))}
                    className="w-full px-4 py-3 text-[14px] text-[#353535] bg-[#F2F3F4] border-2 border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
                <div>
                    <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Salary <span className="text-[#DD4342]">*</span></label>
                  <input
                    type="text"
                    placeholder="0000$"
                    value={editForm.salary}
                    onChange={(e) => setEditForm((f) => ({ ...f, salary: e.target.value }))}
                    className="w-full px-4 py-3 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-2 border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                  />
                </div>
                <div className="space-y-2">
                    <label className="block text-[16px] font-semibold text-[#000000] font-Gantari">Update Profile Picture</label>
                  {/* Display current profile picture if available */}
                  {currentProfilePicture && !editForm.profile_picture && (
                    <div className="mb-3 flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300">
                        <img
                          src={currentProfilePicture}
                          alt="Current profile"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.error-placeholder')) {
                              parent.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center error-placeholder"><span class="text-gray-400 text-xs">No Photo</span></div>';
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px] font-medium text-[#353535] font-Gantari">Current Profile Picture</p>
                        <p className="text-[12px] text-[#666666] font-Gantari">Upload a new file to replace it</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center bg-[#F4F4F4] rounded-[5px] overflow-hidden">
                    <div className="flex-1 px-4 text-[14px] text-[#979797] truncate">
                      {editForm.profile_picture 
                        ? editForm.profile_picture.name 
                        : currentProfilePicture 
                          ? 'Current picture shown above - Choose new file to replace' 
                          : 'Choose file (JPEG or JPG only)'}
                    </div>
                    <label className="px-5 py-3 bg-[#E0E0E0] text-[#353535] text-[14px] font-bold cursor-pointer transition-colors shrink-0 font-Gantari hover:bg-[#D0D0D0]">
                      Browse File
                      <input
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg"
                        onChange={(e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          setEditForm((f) => ({ ...f, profile_picture: file }));
                          // Clear current picture preview when new file is selected
                          if (file) {
                            setCurrentProfilePicture(null);
                          }
                        }}
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
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-4 py-3 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border-2 border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
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
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8 border-t border-[#F0F0F0]">
                <button
                  type="button"
                  onClick={() => { setActiveView('list'); setEditId(null); setSearchParams({}); }}
                  className="w-full sm:w-auto px-14 py-3 rounded-[5px] bg-[#F4F4F4] text-[#353535] font-bold text-[16px]transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="w-full sm:w-auto px-12 py-3 rounded-[5px] bg-[#D1E6FF] text-[#1A1A1A] font-bold text-[16px]  transition-all"
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
                className="absolute left-0 p-2.5 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all"
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
                  className="px-12 py-3 rounded-[5px] bg-[#D1E6FF] text-[#1A1A1A] font-bold text-[16px] disabled:opacity-50 transition-all min-w-[200px]"
                >
                  {inviteSubmitting ? 'Sending...' : 'Send Invitations'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {activeView === 'deactive' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]">
          <div className="bg-white rounded-[20px] max-w-[950px] w-full max-h-[90vh] overflow-hidden p-8 sm:p-10 relative shadow-2xl flex flex-col font-Gantari">
            <div className="flex items-center justify-center mb-8 relative shrink-0">
              <button
                type="button"
                onClick={() => { setActiveView('list'); setdeactiveIds([]); }}
                className="absolute left-0 p-2.5 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all"
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
                {deactiveIds.length} Consultant(s) will be marked as In-Active
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
                              onClick={() => setdeactiveIds((prev) => (prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]))}
                              className={`w-7 h-7 rounded-[5px] border-2 cursor-pointer flex items-center justify-center transition-all ${deactiveIds.includes(emp.id) ? 'bg-[#D1E6FF] border-[#D1E6FF]' : 'bg-white border-[#E0E0E0]'}`}
                            >
                              {deactiveIds.includes(emp.id) && (
                                <svg width="16" height="12" viewBox="0 0 14 11" fill="none">
                                  <path d="M1 5L5 9L13 1" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <span className="text-[16px] font-semibold text-[#6B6B6B]">
                              {emp.full_name} {emp.empid ? `(${emp.empid})` : `(EMP-${(emp.id + 150).toString().padStart(4, '0')})`}
                            </span>
                          </div>
                          {(emp.active === 'deactive' || emp.active === 'deactive') && (
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
                onClick={() => { setActiveView('list'); setdeactiveIds([]); }}
                className="px-12 py-3 rounded-[5px] bg-[#F4F4F4] text-[#353535] font-semibold text-[16px] transition-all min-w-[150px]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handledeactive}
                disabled={!deactiveIds.length || deactiveSubmitting}
                className="px-12 py-3 rounded-[5px] bg-[#D1E6FF] text-[#1A1A1A] font-semibold text-[16px] disabled:opacity-50 transition-all min-w-[180px]"
              >
                {deactiveSubmitting ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showDetailsModal && selectedEmployee && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]">
          <div className="bg-white rounded-[15px] max-w-[750px] w-full max-h-[90vh] overflow-hidden px-[20px] py-[20px] relative shadow-2xl flex flex-col gap-6 font-Gantari">
            {/* Header */}
            <div className="flex items-center justify-center relative shrink-0">
              <button
                type="button"
                onClick={() => { setShowDetailsModal(false); setSelectedEmployee(null); }}
                className="absolute left-0 p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all"
              >
                <FiX className="w-5 h-5 font-bold" />
              </button>
              <h3 className="text-[20px] font-semibold text-[#020202]">View Details</h3>
            </div>

            {/* Profile Section */}
            <div className="flex items-center gap-6 px-4">
              <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-[#F4F4F4] shrink-0">
                {selectedEmployee.profile_picture && selectedEmployee.profile_picture.trim() ? (
                  <img
                    key={`modal-${selectedEmployee.id}-${selectedEmployee.profile_picture}`}
                    src={getProfileUrl(selectedEmployee.profile_picture)}
                    alt={selectedEmployee.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.error(`❌ Failed to load image for ${selectedEmployee.full_name}:`, {
                        attemptedUrl: target.src,
                        generatedUrl: getProfileUrl(selectedEmployee.profile_picture),
                        dbValue: selectedEmployee.profile_picture
                      });
                      // Replace with placeholder on error
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.error-placeholder')) {
                        parent.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center error-placeholder"><span class="text-gray-400 text-sm">No Photo</span></div>';
                      }
                    }}
                    onLoad={() => {
                      console.log(`✅ Successfully loaded image for ${selectedEmployee.full_name}:`, getProfileUrl(selectedEmployee.profile_picture));
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No Photo</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-[24px] font-bold text-[#000000]">{toCamelCase(selectedEmployee.full_name)}</h4>
                <p className="text-[16px] font-semibold text-[#353535]">{selectedEmployee.empid || `EMP-${String(selectedEmployee.id).padStart(4, '0')}`}</p>
              </div>
            </div>

            {/* Details Table */}
            <div className="px-4 sm:px-8 space-y-4 pt-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {[
                { label: 'Date of Birth', value: selectedEmployee.dob },
                { label: 'Phone Number', value: selectedEmployee.phone_number },
                { label: 'Email ID', value: selectedEmployee.email },
                { label: 'User Type', value: selectedEmployee.user_type },
                { label: 'User Role', value: selectedEmployee.user_role },
                { label: 'Address', value: selectedEmployee.address },
                { label: 'Joined Date', value: selectedEmployee.doj },
                { label: 'Department', value: selectedEmployee.department },
                { label: 'Salary', value: selectedEmployee.salary },
                { label: 'Account Number', value: selectedEmployee.accountnumber },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:grid sm:grid-cols-[140px_20px_1fr] text-[15px] gap-2 sm:gap-15 pb-2 sm:pb-0 border-b sm:border-none border-[#F0F0F0] last:border-none"
                >
                  <span className="font-semibold font-Gantari text-[#000000]">{item.label}</span>
                  <span className="hidden sm:inline text-[#353535] font-Gantari text-center">:</span>
                  <span className="text-[#353535] font-Gantari font-medium break-words">{item.value || 'N/A'}</span>
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
