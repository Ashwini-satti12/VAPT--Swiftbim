import { useEffect, useState, useRef } from 'react';
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

    let normalizedPath = path.replace(/\\/g, "/").trim();
    normalizedPath = normalizedPath.replace(/^\d+\s+/, "");
    normalizedPath = normalizedPath.replace(/^\/+/, "");

    const apiBaseUrl = getApiBaseUrl();
    let urlPath = "";

    if (normalizedPath.startsWith("employee/")) {
        const parts = normalizedPath.split("/");
        const encodedParts = parts.map((part, index) =>
            index === 0 ? part : encodeURIComponent(part)
        );
        urlPath = `/uploads/${encodedParts.join("/")}`;
    }
    else if (normalizedPath.startsWith("profiles/")) {
        const filename = normalizedPath.replace("profiles/", "");
        urlPath = `/uploads/employee/${encodeURIComponent(filename)}`;
    }
    else if (!normalizedPath.includes("/")) {
        urlPath = `/uploads/employee/${encodeURIComponent(normalizedPath)}`;
    }
    else {
        const parts = normalizedPath.split("/");
        const encodedParts = parts.map((part, index) =>
            index === 0 ? part : encodeURIComponent(part)
        );
        urlPath = `/uploads/${encodedParts.join("/")}`;
    }

    const base = apiBaseUrl.replace(/\/$/, "");
    if (!base) return urlPath;
    return `${base}${urlPath}`;
};

const toCamelCase = (str: string): string => {
    if (!str) return str;
    return str.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};


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
                className={`w-full flex items-center justify-between transition-all outline-none font-Gantari ${styleType === "header"
                    ? "px-4 py-1.5 bg-[#F2F2F2] rounded-[10px] text-[#616161] text-[14px] font-semibold"
                    : styleType === "table"
                        ? `px-4 py-2.5 min-w-[140px] rounded-[5px] border font-bold text-[14px] ${value === 'Active' ? 'bg-[#E0FFE8] border-[#A7F3D0] text-[#008F22]' : 'bg-[#FFEEEE] border-[#FECACA] text-[#E00100]'}`
                        : "px-4 py-3 bg-[#F4F4F4] rounded-[5px] text-[15px] text-[#353535]"
                    }`}
            >
                <span>{value || placeholder}</span>
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
                                className="w-full text-left px-4 py-2.5 text-[15px] text-[#353535] font-Gantari hover:bg-[#F4F4F4] transition-colors"
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

const ROLE_OPTIONS_FALLBACK = ['Consultant', 'BIM Coordinator', 'BIM Lead', 'Project Manager', 'Technical Director', 'CEO', 'CTO'];

export default function ResourcesV() {
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
        user_role: 'Consultant',
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
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('All');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [roleOptions, setRoleOptions] = useState<string[]>([]);
    const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);

    const canAdd = user?.panel_type === 1;

    useEffect(() => {
        api.get<{ roles?: string[] }>('/api/employees/roles')
            .then(({ data }) => {
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

        api.get<{ departments?: string[] }>('/api/departments')
            .then(({ data }) => {
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

    useEffect(() => {
        api.get<{ employees?: Employee[] }>('/api/employees')
            .then(({ data }) => setList(data.employees ?? []))
            .catch((err) => {
                console.error('Failed to load employees:', err);
                setList([]);
            });
    }, []);

    const editParam = searchParams.get('edit');
    useEffect(() => {
        if (editParam && list.length) {
            const id = parseInt(editParam, 10);
            const emp = list.find((e) => e.id === id);
            if (emp) {
                setEditId(id);
                setActiveView('edit');
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
        if (statusFilter === 'Inactive') return currentStatus !== 'active';
        return true;
    });

    const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    function exportCsv() {
        const headers = ['Name', 'Email', 'Role', 'Status', 'Phone', 'Department'];
        const rows = list.map((e) => [e.full_name, e.email, e.user_role || '', e.active || '', e.phone_number || '', e.department || ''].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'resources.csv';
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
        setEditSubmitting(true);

        const hasNewFile = !!editForm.profile_picture;
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
            if (editForm.password) formData.append('password', editForm.password);
            if (editForm.active) formData.append('active', editForm.active === 'Active' ? 'active' : 'inactive');
            if (editForm.profile_picture) formData.append('profile_picture', editForm.profile_picture);

            api.patch<{ success: boolean; profile_picture?: string | null }>(`/api/employees/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                .then(({ data }) => {
                    setList((prev) => prev.map((e) => e.id === editId ? {
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
                        active: editForm.active === 'Active' ? 'active' : 'inactive',
                        profile_picture: data.profile_picture || e.profile_picture
                    } : e));
                    setEditId(null);
                    setActiveView('list');
                    setSearchParams({});
                }).finally(() => setEditSubmitting(false));
        } else {
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
                active: editForm.active === 'Active' ? 'active' : 'inactive',
                ...(editForm.password ? { password: editForm.password } : {}),
            };
            api.patch(`/api/employees/${editId}`, payload)
                .then(() => {
                    setList((prev) => prev.map((e) => e.id === editId ? {
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
                        active: editForm.active === 'Active' ? 'active' : 'inactive'
                    } : e));
                    setEditId(null);
                    setActiveView('list');
                    setSearchParams({});
                }).finally(() => setEditSubmitting(false));
        }
    }

    function handleStatusToggle(id: number, newStatus: string) {
        const status = newStatus.toLowerCase() === 'active' ? 'active' : 'inactive';
        setList(prev => prev.map(e => e.id === id ? { ...e, active: status } : e));
        api.post('/api/employees/bulk-status', { ids: [id], action: status }).catch(console.error);
    }

    function handleAddSubmit(e: React.FormEvent) {
        e.preventDefault();
        setAddError('');
        if (!form.full_name.trim() || !form.email.trim() || !form.password) {
            setAddError('Name, email and password are required.');
            return;
        }
        setAddSubmitting(true);
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
        if (form.active) formData.append('active', form.active === 'Active' ? 'active' : 'inactive');
        if (form.profile_picture) formData.append('profile_picture', form.profile_picture);

        api.post<{ success: boolean; id?: number; message?: string; profile_picture?: string | null }>('/api/employees', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then(({ data }) => {
                if (data.success) {
                    setActiveView('list');
                    setList((prev) => [...prev, {
                        id: data.id!,
                        full_name: form.full_name,
                        email: form.email,
                        phone_number: form.phone_number,
                        user_role: form.user_role,
                        department: form.department,
                        address: form.address,
                        dob: form.dob,
                        doj: form.joining_date,
                        user_type: form.type,
                        active: form.active === 'Active' ? 'active' : 'inactive',
                        profile_picture: data.profile_picture || undefined,
                        Allpannel: form.roles.join(',')
                    }]);
                    setForm({ full_name: '', email: '', password: '', phone_number: '', type: '', user_role: 'Consultant', department: '', address: '', dob: '', joining_date: '', profile_picture: null, salary: '', accountnumber: '', roles: [], active: 'Active' });
                } else setAddError(data.message || 'Failed to add resource.');
            }).catch((err) => setAddError(err.response?.data?.message || 'Failed to add resource.'))
            .finally(() => setAddSubmitting(false));
    }

    const renderList = () => (
        <>
            <div className="sticky z-50 bg-white mb-4 mt-2">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                    <h2 className="text-[24px] font-Gantari font-semibold text-[#353535] tracking-tight">Resources</h2>
                    {canAdd && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                            <button onClick={() => setActiveView('add')} className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap"><FiPlus className="w-5 h-5" />Add Worker</button>
                            <button onClick={() => setActiveView('invite')} className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap"><FiPlus className="w-5 h-5" />Invite</button>
                            <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap"><img src={exportIcon} className="w-5 h-5" />CSV</button>
                            <button onClick={() => setActiveView('inactive')} className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap">Manage Inactive</button>
                        </div>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row justify-between sm:justify-end items-start sm:items-center gap-4 mt-6 sm:mt-8 mb-2">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setViewMode('table')} className={`p-2 rounded-full transition-all ${viewMode === 'table' ? 'bg-[#DD4342] text-[#F2F2F2]' : 'bg-[#E0E0E0] text-[#000000]'}`}><FiMenu className="w-5 h-5" /></button>
                        <button onClick={() => setViewMode('card')} className={`p-2 rounded-full transition-all ${viewMode === 'card' ? 'bg-[#DD4342] text-[#F2F2F2]' : 'bg-[#E0E0E0] text-[#000000]'}`}><FiGrid className="w-5 h-5" /></button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        {viewMode === 'table' && <CustomDropdown options={['10', '20', '30', '40']} value={`Show: ${itemsPerPage}`} onChange={(val) => { setItemsPerPage(parseInt(val, 10)); setCurrentPage(1); }} placeholder="Show" className="flex-1 sm:min-w-[120px]" styleType="header" />}
                        <CustomDropdown options={['All', 'Active', 'Inactive']} value={statusFilter === 'All' ? 'Status' : statusFilter} onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }} placeholder="Status" className="flex-1 sm:min-w-[120px]" styleType="header" />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {viewMode === 'card' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 p-4 sm:p-6">
                        {filteredList.length === 0 ? <div className="col-span-full text-center py-12 text-slate-500">No resources found.</div> :
                            filteredList.map((emp) => (
                                <div key={emp.id} className="bg-white rounded-[10px] overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="relative h-[120px] overflow-hidden">
                                        <img src={pmprofilebg} className="w-full h-full object-cover opacity-80" />
                                        <div className="absolute top-3 right-3">
                                            <div className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${emp.active === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} text-[10px] font-bold border border-current/20`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${emp.active === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />{emp.active === 'active' ? 'Online' : 'Offline'}
                                            </div>
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 p-4 flex items-center gap-3 bg-gradient-to-t from-black/60 to-transparent">
                                            <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-slate-100 shrink-0">
                                                {emp.profile_picture ? <img src={getProfileUrl(emp.profile_picture)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#353535] font-bold">?</div>}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-white font-bold text-lg truncate leading-tight">{toCamelCase(emp.full_name)}</h4>
                                                <p className="text-white/80 text-xs truncate">{emp.user_role || 'Worker'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => window.open(`mailto:${emp.email}`)} className="flex-1 py-2 bg-[#E8F1FF] text-[#353535] text-[11px] font-bold rounded flex items-center justify-center gap-1.5 hover:bg-[#d0e4ff]"><img src={mailIcon} className="w-3.5 h-3.5" />Mail</button>
                                            <button onClick={() => navigate('/v/communication')} className="flex-1 py-2 bg-[#E8F1FF] text-[#353535] text-[11px] font-bold rounded flex items-center justify-center gap-1.5 hover:bg-[#d0e4ff]"><img src={messageIcon} className="w-3.5 h-3.5" />Chat</button>
                                            <button onClick={() => window.open(`tel:${emp.phone_number}`)} className="flex-1 py-2 bg-[#E8F1FF] text-[#353535] text-[11px] font-bold rounded flex items-center justify-center gap-1.5 hover:bg-[#d0e4ff]"><img src={callIcon} className="w-3.5 h-3.5" />Call</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => { setSelectedEmployee(emp); setShowDetailsModal(true); }} className="py-2 bg-[#DD4342] text-white text-[12px] font-bold rounded flex items-center justify-center gap-1.5 hover:bg-[#c93d3d] transition-colors"><img src={eyeIcon} className="w-4 h-4" />View</button>
                                            {canAdd && <button onClick={() => {
                                                setEditId(emp.id);
                                                setActiveView('edit');
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
                                                    roles: emp.Allpannel ? emp.Allpannel.split(',').map(r => r.trim()) : [],
                                                    active: emp.active === 'active' ? 'Active' : 'Deactivate',
                                                    profile_picture: null
                                                });
                                            }} className="py-2 bg-[#F2F2F2] text-[#353535] text-[12px] font-bold rounded flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-colors"><img src={editIcon} className="w-4 h-4" />Edit</button>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="border border-[#F0F0F0] rounded-[15px] overflow-hidden bg-white mx-4">
                        <table className="min-w-full">
                            <thead className="bg-[#F9F9F9]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-[#353535]">ID</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-[#353535]">Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-[#353535]">Email</th>
                                    <th className="px-6 py-4 text-center text-sm font-bold text-[#353535]">Contact</th>
                                    <th className="px-6 py-4 text-center text-sm font-bold text-[#353535]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F0F0F0]">
                                {paginatedList.map((emp, idx) => (
                                    <tr key={emp.id} className={idx % 2 === 1 ? 'bg-[#FCFCFC]' : 'bg-white'}>
                                        <td className="px-6 py-4 text-xs font-bold text-[#717171] uppercase">{emp.empid || `EMP-${(emp.id + 150).toString().padStart(4, '0')}`}</td>
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                                {emp.profile_picture ? <img src={getProfileUrl(emp.profile_picture)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">?</div>}
                                            </div>
                                            <span className="text-sm font-bold text-[#353535]">{toCamelCase(emp.full_name)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[#717171]">{emp.email}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => window.open(`mailto:${emp.email}`)} className="w-8 h-8 rounded-full bg-[#E8F1FF] flex items-center justify-center hover:bg-[#d0e4ff]"><img src={mailIcon} className="w-4 h-4" /></button>
                                                <button onClick={() => navigate('/v/communication')} className="w-8 h-8 rounded-full bg-[#E8F1FF] flex items-center justify-center hover:bg-[#d0e4ff]"><img src={messageIcon} className="w-4 h-4" /></button>
                                                <button onClick={() => window.open(`tel:${emp.phone_number}`)} className="w-8 h-8 rounded-full bg-[#E8F1FF] flex items-center justify-center hover:bg-[#d0e4ff]"><img src={callIcon} className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-block min-w-[130px]">
                                                <CustomDropdown options={['Active', 'Deactivate']} value={emp.active === 'active' ? 'Active' : 'Deactivate'} onChange={(v) => handleStatusToggle(emp.id, v)} placeholder="Status" styleType="table" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white animate-in fade-in duration-300">
            {/* Detail Modal */}
            {showDetailsModal && selectedEmployee && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
                        <div className="relative h-32">
                            <img src={pmprofilebg} className="w-full h-full object-cover" />
                            <button onClick={() => setShowDetailsModal(false)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white transition-all"><FiX className="w-5 h-5" /></button>
                            <div className="absolute -bottom-10 left-8 w-24 h-24 rounded-full border-4 border-white bg-white overflow-hidden shadow-md">
                                {selectedEmployee.profile_picture ? <img src={getProfileUrl(selectedEmployee.profile_picture)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold bg-slate-100 text-[#353535]">?</div>}
                            </div>
                        </div>
                        <div className="pt-14 p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-[#353535]">{toCamelCase(selectedEmployee.full_name)}</h3>
                                    <p className="text-[#717171]">{selectedEmployee.user_role || 'Worker'}</p>
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${selectedEmployee.active === 'active' ? 'bg-[#E0FFE8] text-[#008F22]' : 'bg-[#FFEEEE] text-[#E00100]'}`}>
                                    ● {selectedEmployee.active === 'active' ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-y-6 gap-x-12 border-t border-[#F0F0F0] pt-6">
                                <div><p className="text-[#717171] text-xs font-bold uppercase mb-1">Email</p><p className="text-[#353535] font-semibold">{selectedEmployee.email}</p></div>
                                <div><p className="text-[#717171] text-xs font-bold uppercase mb-1">Phone</p><p className="text-[#353535] font-semibold">{selectedEmployee.phone_number || '—'}</p></div>
                                <div><p className="text-[#717171] text-xs font-bold uppercase mb-1">Department</p><p className="text-[#353535] font-semibold">{selectedEmployee.department || '—'}</p></div>
                                <div><p className="text-[#717171] text-xs font-bold uppercase mb-1">Joined Date</p><p className="text-[#353535] font-semibold">{selectedEmployee.doj || '—'}</p></div>
                                <div className="col-span-2"><p className="text-[#717171] text-xs font-bold uppercase mb-1">Address</p><p className="text-[#353535] font-semibold leading-relaxed">{selectedEmployee.address || 'No address provided.'}</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'list' ? renderList() : (
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white custom-scrollbar">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <button onClick={() => setActiveView('list')} className="p-2.5 rounded-xl bg-[#F4F4F4] text-[#353535] hover:bg-slate-200 transition-all"><FiX className="w-5 h-5" /></button>
                            <h3 className="text-xl sm:text-2xl font-bold text-[#353535]">{activeView === 'add' ? 'Add New Worker' : activeView === 'edit' ? 'Edit Details' : activeView === 'invite' ? 'Invite Team' : 'Manage Workers'}</h3>
                            <div className="w-10" />
                        </div>

                        {activeView === 'add' || activeView === 'edit' ? (
                            <form onSubmit={activeView === 'add' ? handleAddSubmit : handleEditSubmit} className="space-y-8">
                                {addError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold">{addError}</div>}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div><label className="block text-sm font-bold text-[#353535] mb-2">Full Name *</label><input type="text" placeholder="Worker Full Name" value={activeView === 'add' ? form.full_name : editForm.full_name} onChange={e => activeView === 'add' ? setForm({ ...form, full_name: e.target.value }) : setEditForm({ ...editForm, full_name: e.target.value })} className="w-full px-4 py-3 bg-[#F4F4F4] rounded-lg border-none text-sm outline-none focus:ring-1 focus:ring-[#DD4342]/20" required /></div>
                                        <div><label className="block text-sm font-bold text-[#353535] mb-2">Email Address *</label><input type="email" placeholder="email@example.com" value={activeView === 'add' ? form.email : editForm.email} onChange={e => activeView === 'add' ? setForm({ ...form, email: e.target.value }) : setEditForm({ ...editForm, email: e.target.value })} className="w-full px-4 py-3 bg-[#F4F4F4] rounded-lg border-none text-sm outline-none focus:ring-1 focus:ring-[#DD4342]/20" required /></div>
                                        <div><label className="block text-sm font-bold text-[#353535] mb-2">Password {activeView === 'edit' && '(Leave blank to keep current)'}</label><input type="password" placeholder="••••••••" value={activeView === 'add' ? form.password : editForm.password} onChange={e => activeView === 'add' ? setForm({ ...form, password: e.target.value }) : setEditForm({ ...editForm, password: e.target.value })} className="w-full px-4 py-3 bg-[#F4F4F4] rounded-lg border-none text-sm outline-none focus:ring-1 focus:ring-[#DD4342]/20" required={activeView === 'add'} /></div>
                                    </div>
                                    <div className="space-y-6">
                                        <div><label className="block text-sm font-bold text-[#353535] mb-2">Role</label><CustomDropdown options={roleOptions.length ? roleOptions : ROLE_OPTIONS_FALLBACK} value={activeView === 'add' ? form.user_role : editForm.user_role} onChange={v => activeView === 'add' ? setForm({ ...form, user_role: v }) : setEditForm({ ...editForm, user_role: v })} placeholder="Select Role" /></div>
                                        <div><label className="block text-sm font-bold text-[#353535] mb-2">Department</label><CustomDropdown options={departmentOptions.length ? departmentOptions : ['Production', 'Technical', 'Quality', 'Management']} value={activeView === 'add' ? form.department : editForm.department} onChange={v => activeView === 'add' ? setForm({ ...form, department: v }) : setEditForm({ ...editForm, department: v })} placeholder="Select Department" /></div>
                                        <div><label className="block text-sm font-bold text-[#353535] mb-2">Phone</label><input type="text" placeholder="+1 234 567 890" value={activeView === 'add' ? form.phone_number : editForm.phone_number} onChange={e => activeView === 'add' ? setForm({ ...form, phone_number: e.target.value }) : setEditForm({ ...editForm, phone_number: e.target.value })} className="w-full px-4 py-3 bg-[#F4F4F4] rounded-lg border-none text-sm outline-none focus:ring-1 focus:ring-[#DD4342]/20" /></div>
                                    </div>
                                    <div className="col-span-full">
                                        <label className="block text-sm font-bold text-[#353535] mb-2">Address</label>
                                        <textarea rows={3} value={activeView === 'add' ? form.address : editForm.address} onChange={e => activeView === 'add' ? setForm({ ...form, address: e.target.value }) : setEditForm({ ...editForm, address: e.target.value })} className="w-full px-4 py-3 bg-[#F4F4F4] rounded-lg border-none text-sm outline-none focus:ring-1 focus:ring-[#DD4342]/20 resize-none" placeholder="Residential or Office Address"></textarea>
                                    </div>
                                    <div className="col-span-full">
                                        <label className="block text-sm font-bold text-[#353535] mb-2">Profile Picture</label>
                                        <div className="flex bg-[#F4F4F4] rounded-lg overflow-hidden border border-transparent focus-within:border-[#DD4342]/30 transition-all">
                                            <div className="flex-1 px-4 py-3 text-sm text-[#717171] truncate">{(activeView === 'add' ? form.profile_picture : editForm.profile_picture)?.name || 'Choose JPG/JPEG Image'}</div>
                                            <label className="px-6 py-3 bg-[#EAEAEA] text-[#353535] text-sm font-bold cursor-pointer hover:bg-slate-300 transition-colors">Browse<input type="file" className="hidden" accept=".jpg,.jpeg" onChange={e => activeView === 'add' ? setForm({ ...form, profile_picture: e.target.files?.[0] || null }) : setEditForm({ ...editForm, profile_picture: e.target.files?.[0] || null })} /></label>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 justify-center pt-10 border-t border-[#F0F0F0]">
                                    <button type="button" onClick={() => setActiveView('list')} className="px-10 py-3 bg-[#F4F4F4] text-[#353535] font-bold rounded-lg hover:bg-slate-200 transition-all">Cancel</button>
                                    <button type="submit" disabled={addSubmitting || editSubmitting} className="px-14 py-3 bg-[#DD4342] text-white font-bold rounded-lg hover:bg-[#c93d3d] transition-all disabled:opacity-50">{activeView === 'add' ? (addSubmitting ? 'Adding...' : 'Save Worker') : (editSubmitting ? 'Saving...' : 'Update Details')}</button>
                                </div>
                            </form>
                        ) : activeView === 'invite' ? (
                            <form onSubmit={handleInvite} className="space-y-10">
                                <div className="space-y-6">
                                    <div><label className="block text-sm font-bold text-[#353535] mb-2">Email Addresses</label><textarea value={inviteEmails} onChange={e => setInviteEmails(e.target.value)} rows={5} className="w-full px-5 py-4 bg-[#F4F4F4] rounded-xl border-none outline-none text-sm leading-relaxed" placeholder="email1@example.com, email2@example.com"></textarea><p className="text-[11px] text-[#717171] mt-2 italic px-1">* Separate multiple emails with commas.</p></div>
                                    <div><label className="block text-sm font-bold text-[#353535] mb-2">Message (Optional)</label><textarea value={inviteMessage} onChange={e => setInviteMessage(e.target.value)} rows={3} className="w-full px-5 py-4 bg-[#F4F4F4] rounded-xl border-none outline-none text-sm leading-relaxed" placeholder="Welcome to our team!"></textarea></div>
                                </div>
                                <div className="flex justify-center pt-4">
                                    <button type="submit" disabled={inviteSubmitting} className="px-16 py-3.5 bg-[#DD4342] text-white font-bold rounded-xl hover:bg-[#c93d3d] transition-all disabled:opacity-50 shadow-lg shadow-red-100">{inviteSubmitting ? 'Sending...' : 'Send Invitations'}</button>
                                </div>
                            </form>
                        ) : activeView === 'inactive' ? (
                            <div className="space-y-8">
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl"><p className="text-sm text-[#717171] leading-relaxed">Select workers to mark as inactive. Inactive workers will no longer appear in project assignment lists or dropdowns.</p></div>
                                <div className="border border-[#F0F0F0] rounded-xl overflow-hidden divide-y divide-[#F0F0F0]">
                                    {list.length ? list.map(emp => (
                                        <div key={emp.id} className="flex justify-between items-center p-4 hover:bg-[#F9F9F9] transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div onClick={() => setInactiveIds(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id])} className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${inactiveIds.includes(emp.id) ? 'bg-[#DD4342] border-[#DD4342]' : 'bg-white border-slate-200'}`}>{inactiveIds.includes(emp.id) && <FiX className="text-white w-4 h-4" />}</div>
                                                <div className="flex flex-col"><span className={`text-sm font-bold ${emp.active !== 'active' ? 'text-slate-400' : 'text-[#353535]'}`}>{emp.full_name}</span><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{emp.empid || 'No ID'}</span></div>
                                            </div>
                                            {emp.active !== 'active' && <span className="text-[10px] font-bold text-red-500 uppercase px-2 py-0.5 bg-red-50 rounded">Inactive</span>}
                                        </div>
                                    )) : <div className="p-8 text-center text-slate-400 font-bold">No workers found.</div>}
                                </div>
                                <div className="flex gap-4 justify-center pt-4">
                                    <button type="button" onClick={() => { setActiveView('list'); setInactiveIds([]); }} className="px-10 py-3 bg-[#F4F4F4] text-[#353535] font-bold rounded-lg hover:bg-slate-200 transition-all">Cancel</button>
                                    <button onClick={handleInactive} disabled={!inactiveIds.length || inactiveSubmitting} className="px-14 py-3 bg-[#DD4342] text-white font-bold rounded-lg hover:bg-[#c93d3d] transition-all disabled:opacity-50">{inactiveSubmitting ? 'Updating...' : 'Update Status'}</button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
