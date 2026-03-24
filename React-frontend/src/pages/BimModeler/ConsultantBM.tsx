import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { FiPlus, FiGrid, FiMenu, FiChevronDown, FiX } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
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

const PANEL_ROLES = [
    'Management', 'Accounts',
    'Project Manager', 'Technical Director',
    'Client', 'Sales', 'Admin', 'BIM Lead', 'Employee', 'All'
];

const ROLE_OPTIONS = [
    'Consultant',
    'BIM Coordinator',
    'BIM Lead',
    'Project Manager',
    'Technical Director',
    'CEO',
    'CTO',
];

const toCamelCase = (str: string) => {
    if (!str) return str;
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

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
                    ? "px-3 py-1.5 bg-[#E8E8E8] rounded-[10px] text-[#353535] text-[14px] font-semibold"
                    : styleType === "table"
                        ? `px-4 py-2.5 min-w-[140px] rounded-lg border font-bold text-[14px] ${value === 'Active' ? 'bg-[#E1F6EB] border-[#A7F3D0] text-[#008F22]' : 'bg-[#FFE5E5] border-[#FECACA] text-[#E00100]'}`
                        : `px-4 py-2 bg-[#F2F3F4] rounded-[5px] text-[14px] border border-transparent focus:outline-none focus:border-[#AEACAC52] ${isOpen ? "!border-[#AEACAC52]" : ""}`
                    }`}
            >
                <span className={`whitespace-nowrap ${
                    styleType === "header" || styleType === "form"
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
                                className="w-full text-left px-4 py-2.5 text-[14px] text-[#8B8B8B] font-Gantari hover:text-[#353535] hover:bg-[#F2F2F2] transition-colors"
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

export default function ConsultantBM() {
    const { user } = useAuth();
    const [list, setList] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
    const [showAddModal, setShowAddModal] = useState(false);
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
        profile_picture: null as File | null,
    });
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmails, setInviteEmails] = useState('');
    const [inviteMessage, setInviteMessage] = useState('');
    const [inviteSubmitting, setInviteSubmitting] = useState(false);
    const [showInactiveModal, setShowInactiveModal] = useState(false);
    const [inactiveIds, setInactiveIds] = useState<number[]>([]);
    const [inactiveSubmitting, setInactiveSubmitting] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        full_name: '',
        email: '',
        phone_number: '',
        user_role: 'Consultant',
        department: '',
        address: '',
        dob: '',
        password: '',
        user_type: '',
        doj: '',
        salary: '',
        accountnumber: '',
        profile_picture: null as File | null,
        roles: [] as string[]
    });
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [selectedShow, setSelectedShow] = useState<string>("Show");
    const itemsPerPage = 10;
    const todayISO = new Date().toISOString().split('T')[0];

    const canAdd = user?.panel_type === 1;

    useEffect(() => {
        api.get<{ employees?: Employee[] }>('/api/employees').then(({ data }) => setList(data.employees ?? [])).catch(() => setList([])).finally(() => setLoading(false));
    }, []);

    const editParam = searchParams.get('edit');
    useEffect(() => {
        if (editParam && list.length) {
            const id = parseInt(editParam, 10);
            const emp = list.find((e) => e.id === id);
            if (emp) {
                setEditId(id);
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
                    roles: emp.Allpannel ? emp.Allpannel.split(',').map(r => r.trim()) : []
                });
            }
        }
    }, [editParam, list]);

    const filteredList = list.filter((emp: Employee) => {
        if (statusFilter !== 'All') {
            const currentStatus = (emp.active || '').toLowerCase();
            if (statusFilter === 'Active' && currentStatus !== 'active') return false;
            if (statusFilter === 'Deactive' && currentStatus === 'active') return false;
        }

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
        limitStart = parseInt(parts[0], 10) - 1;
        limitEnd = parseInt(parts[1], 10);
    } else if (selectedShow === "All") {
        limitStart = 0;
        limitEnd = Infinity;
    } else {
        // Fallback to pagination if no range selected
        limitStart = (currentPage - 1) * itemsPerPage;
        limitEnd = currentPage * itemsPerPage;
    }

    const paginatedList = filteredList.slice(limitStart, limitEnd);
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
            setShowInviteModal(false);
            setInviteEmails('');
            setInviteMessage('');
        }).catch(() => { }).finally(() => setInviteSubmitting(false));
    }

    function handleInactive() {
        if (!inactiveIds.length) return;
        setInactiveSubmitting(true);
        api.post('/api/employees/bulk-status', { ids: inactiveIds, action: 'inactive' }).then(() => {
            setList((prev) => prev.map((e) => (inactiveIds.includes(e.id) ? { ...e, active: 'inactive' } : e)));
            setShowInactiveModal(false);
            setInactiveIds([]);
        }).catch(() => { }).finally(() => setInactiveSubmitting(false));
    }

    function handleEditSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!editId) return;
        setEditSubmitting(true);

        if (editForm.dob) {
            const today = new Date();
            const dobDate = new Date(editForm.dob);
            today.setHours(0, 0, 0, 0);
            dobDate.setHours(0, 0, 0, 0);
            if (dobDate > today) {
                setEditSubmitting(false);
                alert('Date of birth cannot be in the future.');
                return;
            }
        }

        // Build payload with all fields from redesign
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
                        };
                    }
                    return e;
                }));
                setEditId(null);
                setSearchParams({});
            })
            .catch((err) => {
                console.error('Update failed:', err);
            })
            .finally(() => setEditSubmitting(false));
    }

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
        setAddSubmitting(true);
        api
            .post<{ success: boolean; id?: number; message?: string }>('/api/employees', {
                full_name: form.full_name.trim(),
                email: form.email.trim(),
                password: form.password,
                phone_number: form.phone_number.trim() || undefined,
                user_role: form.user_role,
                department: form.department.trim() || undefined,
                address: form.address.trim() || undefined,
            })
            .then(({ data }) => {
                if (data.success) {
                    setShowAddModal(false);
                    setForm({
                        full_name: '',
                        email: '',
                        password: '',
                        phone_number: '',
                        user_role: 'Consultant',
                        department: '',
                        address: '',
                        dob: '',
                        type: '',
                        joining_date: '',
                        profile_picture: null
                    });
                    setList((prev) => [...prev, { id: data.id!, full_name: form.full_name, email: form.email, user_role: form.user_role, active: 'active' }]);
                } else {
                    setAddError(data.message || 'Failed to add employee/trainee.');
                }
            })
            .catch((err) => setAddError(err.response?.data?.message || 'Failed to add employee/trainee.'))
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
        <div className="flex flex-col h-[calc(100vh-20px)] overflow-hidden bg-white">
            <div className="sticky top-0 z-50 bg-white shadow-sm px-2 pb-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pt-4">
                    <h2 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari truncate">Employee / Trainee List</h2>
                    <div className="flex flex-wrap items-center gap-6">
                        {canAdd && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[5px] bg-[#DD4342] text-[#F2F2F2]  transition-all shadow-lg shadow-red-100"
                                >
                                    <FiPlus className="text-2xl font-bold text-[#F2F2F2] w-[27px] h-[27px]" />
                                    Add Employee / Trainee
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[5px] bg-[#DD4342] text-[#F2F2F2]  transition-all shadow-lg shadow-red-100"
                                >
                                    <FiPlus className="text-2xl font-bold text-[#F2F2F2] w-[27px] h-[27px]" />
                                    Invite
                                </button>
                                <button
                                    type="button"
                                    onClick={exportCsv}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[5px] bg-[#DD4342] text-[#F2F2F2]  transition-all shadow-lg shadow-red-100"
                                >
                                    <img src={exportIcon} alt="Export" className="w-[27px] h-[27px] object-contain" />
                                    Export to CSV
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowInactiveModal(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[5px] bg-[#DD4342] text-[#F2F2F2]  transition-all shadow-lg shadow-red-100"
                                >
                                    Manage Inactive
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Control Row: List/Grid View and Status Dropdown */}
                <div className="flex justify-end items-center gap-4 shrink-0">
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-full transition-all ${viewMode === 'table' ? 'bg-[#DD4342] text-white' : 'bg-[#E0E0E0] text-[#000000]'}`}
                    >
                        <FiMenu className="w-6 h-6" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('card')}
                        className={`p-2 rounded-full transition-all ${viewMode === 'card' ? 'bg-[#DD4342] text-white' : 'bg-[#E0E0E0] text-[#000000]'}`}
                    >
                        <FiGrid className="w-6 h-6" />
                    </button>
                    {viewMode === 'table' && (
                        <CustomDropdown
                            options={['1-50', '51-100', '101-150', '151-200', '201-250', '251-300', 'All']}
                            value={selectedShow === 'Show' ? 'Show' : selectedShow}
                            onChange={(val) => setSelectedShow(val)}
                            placeholder="Show"
                            className="flex-1 sm:min-w-[120px]"
                            styleType="header"
                        />
                    )}
                    <CustomDropdown
                        options={['All', 'Employee', 'Trainee']}
                        value={typeFilter === 'All' ? 'Type' : typeFilter}
                        onChange={(val) => setTypeFilter(val)}
                        placeholder="Type"
                        className="flex-1 sm:min-w-[120px]"
                        styleType="header"
                    />
                    <CustomDropdown
                        options={viewMode === 'card' ? ['All', 'Active', 'Deactivate'] : ['All', 'Active', 'deactive']}
                        value={statusFilter === 'All' ? 'Status' : statusFilter}
                        onChange={(val) => {
                            let nextStatus = val;
                            if (viewMode === 'card' && val === 'Deactivate') nextStatus = 'Deactive';
                            setStatusFilter(nextStatus);
                        }}
                        placeholder="Status"
                        className="flex-1 sm:min-w-[120px]"
                        styleType="header"
                    />
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar relative">
                {viewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {list.length === 0 ? (
                            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
                                No consultants found.
                            </div>
                        ) : (
                            list.map((emp) => (
                                <div key={emp.id} className="bg-white rounded-2xl overflow-hidden border-2 border-slate-200 transition-all ">
                                    {/* Image Section */}
                                    <div className="relative h-40 overflow-hidden group">
                                        <div className="absolute inset-0 z-0">
                                            <img
                                                src={pmprofilebg}
                                                alt="Background"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40" />
                                        </div>

                                        {/* Top Status - Pill Shape */}
                                        <div className="absolute top-4 right-4 z-10">
                                            <div className={`flex items-center gap-1.5 px-2 rounded-full border shadow-sm ${emp.active === 'active' ? 'bg-[#E0FFE8] border-emerald-100' : 'bg-[#FFEEEE] border-red-100'}`}>
                                                <span className={`w-2 h-2 rounded-full ${emp.active === 'active' ? 'bg-[#166534]' : 'bg-[#E00100]'}`}></span>
                                                <span className={`text-[11px] font-semibold ${emp.active === 'active' ? 'text-[#008F22]' : 'text-[#E00100]'}`}>
                                                    {emp.active === 'active' ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* User Profile Info on Image */}
                                        <div className="absolute inset-x-0 bottom-0 p-5 flex items-center gap-4 z-10">
                                            <div className="w-20 h-20 rounded-full bg-white overflow-hidden shrink-0">
                                                <img
                                                    // src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.email}`} 
                                                    alt={emp.full_name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-[22px]  font-Gantari font-semibold text-[#F2F2F2] leading-tight tracking-tight truncate">{emp.full_name}</h3>
                                                <p className="text-[16px]  text-[#F2F2F2] mt-1 truncate">{emp.address}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    <div className="p-5 space-y-5">
                                        {/* Contact Buttons */}
                                        <div className="flex items-center gap-5">
                                            <button className="flex-1 flex items-center justify-center gap-4 py-3 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[14px] font-semibold font-Gantari transition-all">
                                                <img src={mailIcon} alt="Mail" className="text-xl" /> Mail
                                            </button>
                                            <button className="flex-1 flex items-center justify-center gap-3 py-3 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[14px] font-semibold font-Gantari transition-all">
                                                <img src={messageIcon} alt="Message" className="text-xl" /> Message
                                            </button>
                                            <button className="flex-1 flex items-center justify-center gap-4 py-3 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[14px] font-semibold font-Gantari transition-all">
                                                <img src={callIcon} alt="Call" className="text-xl" /> Call
                                            </button>
                                        </div>

                                        <hr className="border-slate-200" />

                                        {/* Actions Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedEmployee(emp); setShowDetailsModal(true); }}
                                                className="flex items-center justify-center gap-3 py-3 bg-[#DD4342] text-white rounded-[5px] text-[14px] font-Gantari"
                                            >
                                                <img src={eyeIcon} alt="View" className="text-xl" /> View
                                            </button>
                                            {canAdd && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditId(emp.id);
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
                                                            roles: emp.Allpannel ? emp.Allpannel.split(',').map(r => r.trim()) : []
                                                        });
                                                    }}
                                                    className="flex items-center justify-center gap-3 py-3 bg-[#F2F2F2] text-[#353535] rounded-[5px] text-[14px] font-Gantari"
                                                >
                                                    <img src={editIcon} alt="Edit" className="text-xl" /> Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-[15px] border-2 border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="sticky top-0 z-30 bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-6 text-left text-[17px] font-bold font-Gantari text-[#1A1A1A]">Emp ID</th>
                                        <th className="px-6 py-6 text-left text-[17px] font-bold font-Gantari text-[#1A1A1A]">Consultant Name</th>
                                        <th className="px-6 py-6 text-left text-[17px] font-bold font-Gantari text-[#1A1A1A]">Email ID</th>
                                        <th className="px-6 py-6 text-center text-[17px] font-bold font-Gantari text-[#1A1A1A]">Contact Info</th>
                                        <th className="px-6 py-6 text-center text-[17px] font-bold font-Gantari text-[#1A1A1A]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {paginatedList.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-Gantari">
                                                No consultants found.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedList.map((emp, idx) => (
                                            <tr key={emp.id} className={idx % 2 === 1 ? 'bg-[#F9F9F9]' : 'bg-white'}>
                                                <td className="px-6 py-4 text-[15px] font-semibold font-Gantari text-[#6B6B6B]">{emp.empid || `EMP0${emp.id + 10}`}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200">
                                                                <img
                                                                    // src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.email}`} 
                                                                    alt={emp.full_name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <span className={`absolute -top-1 -left-1 w-3.5 h-3.5 border-2 border-white rounded-full ${emp.active === 'active' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}></span>
                                                        </div>
                                                        <span className="text-[15px] font-semibold font-Gantari text-[#353535]">{emp.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[15px] font-semibold font-Gantari text-[#6B6B6B]">{emp.email}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button className="p-2.5 rounded-full bg-[#DBE9FE] hover:bg-[#c6dbff] transition-colors">
                                                            <img src={mailIcon} className="w-5 h-5" alt="Mail" />
                                                        </button>
                                                        <button className="p-2.5 rounded-full bg-[#DBE9FE] hover:bg-[#c6dbff] transition-colors">
                                                            <img src={messageIcon} className="w-5 h-5" alt="Message" />
                                                        </button>
                                                        <button className="p-2.5 rounded-full bg-[#DBE9FE] hover:bg-[#c6dbff] transition-colors">
                                                            <img src={callIcon} className="w-5 h-5" alt="Call" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        <button className={`flex items-center justify-between gap-4 px-4 py-2.5 min-w-[140px] rounded-[5px] border font-bold text-[14px] font-Gantari ${emp.active === 'active' ? 'bg-[#E0FFE8] border-[#A7F3D0] text-[#008F22]' : 'bg-[#FFEEEE] border-[#FECACA] text-[#E00100]'}`}>
                                                            {emp.active === 'active' ? 'Active' : 'Deactivate'}
                                                            <FiChevronDown className="w-5 h-5 opacity-70" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Bottom Bar - Always visible and sticky */}
            {viewMode === 'table' && (
                <div className="sticky bottom-0 z-50 bg-white py-4 mt-auto">
                    <div className="flex justify-end pr-2">
                        <div className="flex items-center bg-[#F2F2F2] rounded-[10px] overflow-hidden border border-slate-200 ">
                            <div className="px-5 py-2.5 text-[14px] font-semibold text-[#6B6B6B] border-r border-slate-200">
                                Showing:
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-5 py-2.5 flex items-center gap-2 text-[14px] font-semibold text-[#6B6B6B] hover:bg-slate-100 transition-colors border-r border-slate-200 disabled:opacity-50"
                            >
                                <FiChevronDown className="w-4 h-4 rotate-90" />
                                Prev
                            </button>

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
                                        className={`px-5 py-2.5 text-[14px] font-bold border-r border-slate-200 transition-colors ${currentPage === page ? 'text-white bg-[#DD4342]' : 'text-[#6B6B6B] hover:bg-slate-100'}`}
                                    >
                                        {(page - 1) * 10 + 1}-{Math.min(page * 10, list.length)}
                                    </button>
                                ));
                            })()}

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-5 py-2.5 flex items-center gap-2 text-[14px] font-semibold text-[#6B6B6B] hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                Next
                                <FiChevronDown className="w-4 h-4 -rotate-90" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddModal && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[15px] max-w-[1174px] w-full px-[20px] py-[20px] max-h-[795px] overflow-y-auto relative">
                        {/* Header Section */}
                        <div className="flex items-center justify-center mb-4 relative">
                            <button
                                type="button"
                                onClick={() => { setShowAddModal(false); setAddError(''); }}
                                className="absolute left-0 p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all"
                            >
                                <FiX className="w-5 h-5 font-bold" />
                            </button>
                            <h3 className="text-[24px] font-semibold text-[#020202] font-Gantari">Add New Consultant</h3>
                        </div>

                        <form onSubmit={handleAddSubmit} className="space-y-5">
                            {addError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">{addError}</p>}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                {/* Left Column */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-1.5 font-Gantari">Full Name</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Employee Name"
                                            value={form.full_name}
                                            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px]  text-[14px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-1.5 font-Gantari">Phone Number</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Phone Number"
                                            value={form.phone_number}
                                            onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px]  text-[14px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-1.5 font-Gantari">Password</label>
                                        <input
                                            type="password"
                                            placeholder="Enter Password"
                                            value={form.password}
                                            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px]  text-[14px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-1.5 font-Gantari">Role</label>
                                        <div className="relative">
                                            <select
                                                value={form.user_role}
                                                onChange={(e) => setForm((f) => ({ ...f, user_role: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px]  text-[14px] text-[#353535] font-Gantari appearance-none cursor-pointer transition-all outline-none"
                                            >
                                                <option value="" disabled>Select Role</option>
                                                {ROLE_OPTIONS.map((r) => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#353535] pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-1.5 font-Gantari">Department</label>
                                        <div className="relative">
                                            <select
                                                value={form.department}
                                                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px]  text-[14px] text-[#353535] font-Gantari appearance-none cursor-pointer transition-all outline-none"
                                            >
                                                <option value="" disabled>Select Department</option>
                                                <option value="BIM">BIM</option>
                                                <option value="Architecture">Architecture</option>
                                                <option value="Engineering">Engineering</option>
                                            </select>
                                            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#353535] pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-[14px] font-semibold text-[#1A1A1A] mb-1.5 font-Gantari">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={form.dob}
                                            onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                                            max={todayISO}
                                            className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px] focus:ring-1 focus:ring-[#D1E6FF] text-[14px] text-[#979797] font-Gantari transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[14px] font-semibold text-[#1A1A1A] mb-1.5 font-Gantari">Email</label>
                                        <input
                                            type="email"
                                            placeholder="Enter Email"
                                            value={form.email}
                                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px] focus:ring-1 focus:ring-[#D1E6FF] text-[14px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[14px] font-semibold text-[#1A1A1A] mb-1.5 font-Gantari">Type</label>
                                        <div className="relative">
                                            <select
                                                value={form.type}
                                                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px] focus:ring-1 focus:ring-[#D1E6FF] text-[14px] text-[#353535] font-Gantari appearance-none cursor-pointer transition-all outline-none"
                                            >
                                                <option value="" disabled>Select Type</option>
                                                <option value="Full Time">Full Time</option>
                                                <option value="Part Time">Part Time</option>
                                                <option value="Contract">Contract</option>
                                            </select>
                                            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#353535] pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[14px] font-semibold text-[#1A1A1A] mb-1.5 font-Gantari">Date of Joining</label>
                                        <input
                                            type="date"
                                            value={form.joining_date}
                                            onChange={(e) => setForm((f) => ({ ...f, joining_date: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px] focus:ring-1 focus:ring-[#D1E6FF] text-[14px] text-[#979797] font-Gantari transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[14px] font-semibold text-[#1A1A1A] mb-1.5 font-Gantari">Update Profile Picture</label>
                                        <div className="flex bg-[#F4F4F4] rounded-[5px] overflow-hidden transition-all focus-within:ring-1 focus-within:ring-[#D1E6FF]">
                                            <div className="flex-1 px-4 py-2.5 text-[14px] text-[#979797] font-Gantari truncate">
                                                {form.profile_picture ? form.profile_picture.name : "Choose file (JPEG or JPG only)"}
                                            </div>
                                            <label className="bg-[#E0E0E0] px-5 py-2.5 cursor-pointer text-[13px] font-semibold text-[#353535] hover:bg-slate-300 transition-colors font-Gantari shrink-0 flex items-center justify-center">
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

                            <div>
                                <label className="block text-[14px] font-semibold text-[#1A1A1A] mb-1.5 font-Gantari">Address</label>
                                <textarea
                                    rows={3}
                                    placeholder="Type your Address..."
                                    value={form.address}
                                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px] focus:ring-1 focus:ring-[#D1E6FF] text-[14px] placeholder:text-[#979797] font-Gantari transition-all resize-none outline-none leading-relaxed"
                                />
                            </div>

                            <div className="flex gap-4 justify-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-8 py-2.5 rounded-[5px] bg-[#F2F2F2] text-[#353535] font-bold text-[15px] hover:bg-slate-200 transition-all font-Gantari min-w-[120px]"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={addSubmitting}
                                    className="px-8 py-2.5 rounded-[5px] bg-[#D1E6FF] text-[#1A1A1A] font-bold text-[15px] hover:bg-[#b0ccff] disabled:opacity-50 transition-all font-Gantari min-w-[120px]"
                                >
                                    {addSubmitting ? 'Adding...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}





            {showInviteModal && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]">
                    <div className="bg-white rounded-[15px] max-w-[873px] w-full px-[30px] py-[20px] relative shadow-2xl">
                        {/* Header Section */}
                        <div className="flex items-center justify-center mb-8 relative">
                            <button
                                type="button"
                                onClick={() => { setShowInviteModal(false); setInviteEmails(''); setInviteMessage(''); }}
                                className="absolute left-0 p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all"
                            >
                                <FiX className="w-5 h-5 font-bold" />
                            </button>
                            <h3 className="text-[24px] font-semibold text-[#020202] font-Gantari">Invite New Consultant</h3>
                        </div>

                        <form onSubmit={handleInvite} className="space-y-6">
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Email Addresses</label>
                                <textarea
                                    value={inviteEmails}
                                    onChange={(e) => setInviteEmails(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] placeholder:text-[#979797] font-Gantari transition-all outline-none resize-none leading-relaxed"
                                    placeholder="Enter Multiple Email addresses separated by commas,"
                                />
                                <p className="text-[12px] text-[#666666] mt-2 font-Gantari">Separate multiple emails with commas (eg., email01@eg.com)</p>
                            </div>

                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Invitation Message</label>
                                <textarea
                                    value={inviteMessage}
                                    onChange={(e) => setInviteMessage(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] placeholder:text-[#979797] font-Gantari transition-all outline-none resize-none leading-relaxed"
                                    placeholder="Enter your Invitation Message.,"
                                />
                            </div>

                            <div className="flex justify-center pt-4">
                                <button
                                    type="submit"
                                    disabled={inviteSubmitting}
                                    className="px-10 py-3 rounded-[5px] bg-[#D1E6FF] text-[#1A1A1A] font-bold text-[16px] hover:bg-[#b0ccff] disabled:opacity-50 transition-all font-Gantari min-w-[200px]"
                                >
                                    {inviteSubmitting ? 'Sending...' : 'Send Invitations'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {showInactiveModal && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]">
                    <div className="bg-white rounded-[15px] max-w-[850px] w-full px-[40px] py-[30px] relative shadow-2xl max-h-[90vh] flex flex-col">
                        {/* Header Section */}
                        <div className="flex items-center justify-center mb-6 relative shrink-0">
                            <button
                                type="button"
                                onClick={() => { setShowInactiveModal(false); setInactiveIds([]); }}
                                className="absolute left-0 p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all"
                            >
                                <FiX className="w-5 h-5 font-bold" />
                            </button>
                            <h3 className="text-[24px] font-semibold text-[#020202] font-Gantari">Manage In-active Consultants</h3>
                        </div>

                        <div className="shrink-0 mb-6">
                            <p className="text-[15px] text-[#353535] font-Gantari mb-4 leading-relaxed">
                                Select Consultants to mark as IN-Active. In-Active Consultants will not appear in Project Assignment dropdowns.
                            </p>
                            <p className="text-[16px] font-bold text-[#3d3399] font-Gantari">
                                {inactiveIds.length} Consultant(s) will be marked as In-Active
                            </p>
                        </div>

                        {/* List Area */}
                        <div className="flex-1 overflow-y-auto border border-[#E0E0E0] rounded-[10px] custom-scrollbar">
                            {(() => {
                                const grouped = list.reduce((acc: Record<string, Employee[]>, emp) => {
                                    const role = emp.user_role || 'General';
                                    if (!acc[role]) acc[role] = [];
                                    acc[role].push(emp);
                                    return acc;
                                }, {});

                                return Object.entries(grouped).map(([role, emps]) => (
                                    <div key={role} className="border-b border-[#E0E0E0] last:border-none">
                                        <div className="px-5 py-3 bg-white font-bold text-[15px] text-[#000000] font-Gantari border-b border-[#E0E0E0]">
                                            {role}
                                        </div>
                                        <div className="divide-y divide-[#F0F0F0]">
                                            {emps.map((emp, idx) => (
                                                <div
                                                    key={emp.id}
                                                    className={`flex items-center justify-between px-5 py-3.5 transition-colors ${idx % 2 === 1 ? 'bg-[#F9F9F9]' : 'bg-white'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div
                                                            onClick={() => setInactiveIds((prev) => (prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]))}
                                                            className={`w-6 h-6 rounded-[5px] border-2 cursor-pointer flex items-center justify-center transition-all ${inactiveIds.includes(emp.id) ? 'bg-[#D1E6FF] border-[#D1E6FF]' : 'bg-white border-[#E0E0E0]'}`}
                                                        >
                                                            {inactiveIds.includes(emp.id) && (
                                                                <svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M1 5L5 9L13 1" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <span className="text-[15px] font-medium text-[#353535] font-Gantari">
                                                            {emp.full_name} {emp.empid ? `(${emp.empid})` : ''}
                                                        </span>
                                                    </div>
                                                    {(emp.active === 'inactive' || emp.active === 'deactive') && (
                                                        <span className="px-3 py-1 bg-[#FFE3E3] text-[#FF4D4D] text-[12px] font-semibold rounded-full font-Gantari shrink-0">
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

                        {/* Footer */}
                        <div className="flex gap-4 justify-center pt-8 shrink-0">
                            <button
                                type="button"
                                onClick={() => { setShowInactiveModal(false); setInactiveIds([]); }}
                                className="px-10 py-2.5 rounded-[5px] bg-[#F2F2F2] text-[#353535] font-bold text-[16px] hover:bg-slate-200 transition-all font-Gantari min-w-[140px]"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={handleInactive}
                                disabled={!inactiveIds.length || inactiveSubmitting}
                                className="px-10 py-2.5 rounded-[5px] bg-[#D1E6FF] text-[#1A1A1A] font-bold text-[16px] hover:bg-[#b0ccff] disabled:opacity-50 transition-all font-Gantari min-w-[140px]"
                            >
                                {inactiveSubmitting ? 'Updating...' : 'Update Status'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {editId !== null && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]">
                    <div className="bg-white rounded-[15px] max-w-[1174px] w-full px-[30px] py-[30px] max-h-[92vh] overflow-y-auto relative shadow-2xl custom-scrollbar">
                        {/* Header Section */}
                        <div className="flex items-center justify-center mb-6 relative group">
                            <button
                                type="button"
                                onClick={() => { setEditId(null); setSearchParams({}); }}
                                className="absolute left-0 p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all"
                            >
                                <FiX className="w-5 h-5 font-bold" />
                            </button>
                            <h3 className="text-[24px] font-semibold text-[#020202] font-Gantari">Edit Details</h3>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">

                                {/* Column 1 */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Full Name</label>
                                        <input
                                            type="text"
                                            placeholder="Enter employee name"
                                            value={editForm.full_name}
                                            onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                                            className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Phone Number</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Phone Number"
                                            value={editForm.phone_number}
                                            onChange={(e) => setEditForm((f) => ({ ...f, phone_number: e.target.value }))}
                                            className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Password</label>
                                        <input
                                            type="password"
                                            placeholder="Enter Password"
                                            value={editForm.password}
                                            onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                                            className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                        />
                                    </div>

                                    <div className="relative">
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Role</label>
                                        <div className="relative">
                                            <select
                                                value={editForm.user_role}
                                                onChange={(e) => setEditForm((f) => ({ ...f, user_role: e.target.value }))}
                                                className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] text-[#353535] font-Gantari appearance-none cursor-pointer transition-all outline-none"
                                            >
                                                <option value="" disabled>Select Role</option>
                                                {ROLE_OPTIONS.map((r) => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#353535] pointer-events-none opacity-70" />
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Department</label>
                                        <div className="relative">
                                            <select
                                                value={editForm.department}
                                                onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                                                className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] text-[#353535] font-Gantari appearance-none cursor-pointer transition-all outline-none"
                                            >
                                                <option value="" disabled>Select Department</option>
                                                <option value="BIM">BIM</option>
                                                <option value="HR">HR</option>
                                                <option value="Sales">Sales</option>
                                            </select>
                                            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#353535] pointer-events-none opacity-70" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Account Number</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Account Number"
                                            value={editForm.accountnumber}
                                            onChange={(e) => setEditForm((f) => ({ ...f, accountnumber: e.target.value }))}
                                            className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
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
                                            onChange={(e) => setEditForm((f) => ({ ...f, dob: e.target.value }))}
                                            max={todayISO}
                                            className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] font-Gantari transition-all outline-none text-[#353535]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Email</label>
                                        <input
                                            type="email"
                                            placeholder="Enter Email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                                            className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Type</label>
                                        <div className="relative">
                                            <select
                                                value={editForm.user_type}
                                                onChange={(e) => setEditForm((f) => ({ ...f, user_type: e.target.value }))}
                                                className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] text-[#353535] font-Gantari appearance-none cursor-pointer transition-all outline-none"
                                            >
                                                <option value="" disabled>Select Type</option>
                                                <option value="Employee">Employee</option>
                                                <option value="Consultant">Consultant</option>
                                                <option value="Contractor">Contractor</option>
                                            </select>
                                            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#353535] pointer-events-none opacity-70" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Date of Joining</label>
                                        <input
                                            type="date"
                                            value={editForm.doj}
                                            onChange={(e) => setEditForm((f) => ({ ...f, doj: e.target.value }))}
                                            className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] font-Gantari transition-all outline-none text-[#353535]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Salary</label>
                                        <input
                                            type="text"
                                            placeholder="0000$"
                                            value={editForm.salary}
                                            onChange={(e) => setEditForm((f) => ({ ...f, salary: e.target.value }))}
                                            className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[16px] font-semibold text-[#000000] font-Gantari">Update Profile Picture</label>
                                        <div className="flex items-center bg-[#F4F4F4] rounded-[5px] overflow-hidden">
                                            <div className="flex-1 px-4 text-[14px] text-[#979797] truncate">
                                                {editForm.profile_picture ? editForm.profile_picture.name : 'Choose file (JPEG or JPG only)'}
                                            </div>
                                            <label className="px-5 py-3 bg-[#E0E0E0] text-[#353535] text-[14px] font-bold cursor-pointer hover:bg-slate-300 transition-colors shrink-0 font-Gantari">
                                                Browse File
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept=".jpg,.jpeg"
                                                    onChange={(e) => setEditForm((f) => ({ ...f, profile_picture: e.target.files ? e.target.files[0] : null }))}
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
                                    placeholder="Enter Address"
                                    value={editForm.address}
                                    onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                                    className="w-full px-4 py-3 bg-[#F4F4F4] border-none rounded-[5px] text-[15px] placeholder:text-[#979797] font-Gantari transition-all outline-none resize-none"
                                />
                            </div>

                            {/* Panel Access Section */}
                            <div className="mt-4 bg-[#F9F9F9] p-8 rounded-[10px] border border-[#E0E0E0]">
                                <h4 className="text-[18px] font-bold text-[#000000] mb-8 font-Gantari">Select Panel Access Control</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-6">
                                    {PANEL_ROLES.map((role, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-4 cursor-pointer group"
                                            onClick={() => {
                                                const currentRoles = [...editForm.roles];
                                                if (currentRoles.includes(role)) {
                                                    setEditForm({ ...editForm, roles: currentRoles.filter(r => r !== role) });
                                                } else {
                                                    setEditForm({ ...editForm, roles: [...currentRoles, role] });
                                                }
                                            }}
                                        >
                                            <div className={`w-[24px] h-[24px] rounded-[5px] border-2 flex items-center justify-center transition-all ${editForm.roles.includes(role) ? 'bg-[#D1E6FF] border-[#D1E6FF]' : 'bg-white border-[#D1D1D1] group-hover:border-[#3d3399]'}`}>
                                                {editForm.roles.includes(role) && (
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

                            {/* Form Actions */}
                            <div className="flex gap-6 justify-center pt-8 border-t border-[#F0F0F0]">
                                <button
                                    type="button"
                                    onClick={() => { setEditId(null); setSearchParams({}); }}
                                    className="px-12 py-3 rounded-[5px] bg-[#F4F4F4] text-[#353535] font-bold text-[16px] hover:bg-slate-200 transition-all font-Gantari min-w-[160px]"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSubmitting}
                                    className="px-12 py-3 rounded-[5px] bg-[#D1E6FF] text-[#1A1A1A] font-bold text-[16px] hover:bg-[#b0ccff] disabled:opacity-50 transition-all font-Gantari min-w-[160px]"
                                >
                                    {editSubmitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
            {showDetailsModal && selectedEmployee && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]">
                    <div className="bg-white rounded-[15px] max-w-[750px] w-full px-[20px] py-[20px] relative shadow-2xl flex flex-col gap-6 font-Gantari">
                        {/* Header */}
                        <div className="flex items-center justify-center relative">
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
                                <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmployee.email}`}
                                    alt={selectedEmployee.full_name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h4 className="text-[24px] font-bold text-[#000000]">{selectedEmployee.full_name}</h4>
                                <p className="text-[16px] font-semibold text-[#353535]">{selectedEmployee.empid || `EMP-${String(selectedEmployee.id).padStart(4, '0')}`}</p>
                            </div>
                        </div>

                        {/* Details Table */}
                        <div className="px-8 space-y-4 pt-2">
                            {[
                                { label: 'Date of Birth', value: selectedEmployee.dob },
                                { label: 'Phone Number', value: selectedEmployee.phone_number },
                                { label: 'Email ID', value: selectedEmployee.email },
                                { label: 'User Type', value: selectedEmployee.user_type },
                                { label: 'User Role', value: selectedEmployee.user_role },
                                { label: 'Address', value: selectedEmployee.address },
                                { label: 'Joined Date', value: selectedEmployee.doj },
                            ].map((item, idx) => (
                                <div key={idx} className="grid grid-cols-[140px_20px_1fr] text-[15px] gap-15">
                                    <span className="font-semibold font-Gantari text-[#00000] ">{item.label}</span>
                                    <span className="text-[#353535]  font-Gantari text-center ">:</span>
                                    <span className="text-[#353535] font-Gantari font-medium break-words">{item.value}</span>
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
