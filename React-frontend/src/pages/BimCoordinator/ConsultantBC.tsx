import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiGrid, FiMenu, FiChevronDown, FiX } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

// Get API base URL for image URLs (same logic as other panels)
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
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';

const SHOW_OPTIONS = ["Show", "1-50", "51-100", "101-150", "151-200", "201-250", "251-300", "All"];
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

    // Remove leading numbers and spaces (e.g., "1 WhatsApp Image..." or "0 anu.jpg")
    normalizedPath = normalizedPath.replace(/^\d+\s+/, "");

    // Remove leading slashes if any
    normalizedPath = normalizedPath.replace(/^\/+/, "");

    // Get API base URL
    const apiBaseUrl = getApiBaseUrl();

    // Build the full URL path
    let urlPath = "";

    // If path already starts with "employee/", use it directly
    if (normalizedPath.startsWith("employee/")) {
        const parts = normalizedPath.split("/");
        const encodedParts = parts.map((part, index) =>
            index === 0 ? part : encodeURIComponent(part)
        );
        urlPath = `/uploads/${encodedParts.join("/")}`;
    }
    // If path starts with "profiles/", redirect to employee folder instead
    else if (normalizedPath.startsWith("profiles/")) {
        const filename = normalizedPath.replace("profiles/", "");
        urlPath = `/uploads/employee/${encodeURIComponent(filename)}`;
    }
    // If path doesn't include a subfolder, assume it's in employee folder
    else if (!normalizedPath.includes("/")) {
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

    const base = apiBaseUrl.replace(/\/$/, "");
    // If base URL is empty, use relative path (works with Vite proxy)
    if (!base) {
        return urlPath;
    }

    return `${base}${urlPath}`;
};



const SCROLLBAR_STYLE = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #979797;
    border-radius: 10px;
  }
  .custom-scrollbar {
    scrollbar-width: auto;
    scrollbar-color: #979797 transparent;
  }
`;

const isEmployeeActive = (emp: Employee) => {
    return emp.active === 'active' || emp.active === 'Active';
};

const getAllowedRoles = () => [
    'Consultant', 'BIM Coordinator', 'BIM Lead', 'Project Manager', 'BIM Modeler', 'BIM Architect', 'BIM Architect Lead', 'Tekla Modeler', 'BIM Project Manager', 'Business Development Manager', 'Vice President Projects', 'Junior BIM Modeler', 'Architect Intern', 'BIM Modeler- MEP', 'HR Executive', 'Graphic Designer', 'Management'
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


export default function ConsultantBC() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [list, setList] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
    const [currentPage, setCurrentPage] = useState(1);
    const effectivePerPage = 10;
    
    // Missing States
    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState<any>({
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
        profile_picture: null,
        active: 'Active',
    });
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [addError, setAddError] = useState('');
    const [departments, setDepartments] = useState<string[]>([]);





    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmails, setInviteEmails] = useState('');
    const [inviteMessage, setInviteMessage] = useState('');
    const [inviteSubmitting, setInviteSubmitting] = useState(false);
    const [showInactiveModal, setShowInactiveModal] = useState(false);
    const [inactiveIds, setInactiveIds] = useState<number[]>([]);
    const [inactiveSubmitting, setInactiveSubmitting] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Deactive'>('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [selectedShow, setSelectedShow] = useState<string>("Show");
    const todayISO = new Date().toISOString().split('T')[0];

    const COUNTRY_CODES = ['+91', '+1', '+44', '+61', '+81', '+971', '+33', '+49', '+82', '+86'];
    const [countryCode, setCountryCode] = useState('+91');

    const canAdd = user?.panel_type === 1;





    useEffect(() => {
        const styleTag = document.createElement('style');
        styleTag.textContent = SCROLLBAR_STYLE;
        document.head.appendChild(styleTag);
        return () => { document.head.removeChild(styleTag); };
    }, []);





    useEffect(() => {
        api.get<{ employees?: Employee[] }>('/api/employees').then(({ data }) => setList(data.employees ?? [])).catch(() => setList([])).finally(() => setLoading(false));
    }, []);


    useEffect(() => {
        // Fetch departments
        api.get<{ departments?: string[] }>('/api/departments')
            .then(({ data }) => setDepartments(data.departments || []))
            .catch((error) => {
                console.error('Error fetching departments:', error);
                setDepartments([]);
            });
    }, []);


    const filteredList = list.filter((emp) => {
        if (statusFilter !== 'All') {
            const isActive = isEmployeeActive(emp);
            if (statusFilter === 'Active' && !isActive) return false;
            if (statusFilter === 'Deactive' && isActive) return false;
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
        if (parts.length === 2) {
            limitStart = parseInt(parts[0], 10) - 1;
            limitEnd = parseInt(parts[1], 10);
        }
    } else if (selectedShow === "All" || selectedShow === "Show") {
        limitStart = (currentPage - 1) * 10;
        limitEnd = currentPage * 10;
    }
    const paginatedList = filteredList.slice(limitStart, limitEnd);


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


    function handleAddSubmit(e: React.FormEvent) {
        e.preventDefault();
        setAddError('');
        if (!form.full_name.trim() || !form.email.trim() || !form.password) {
            setAddError('Name, email and password are required.');
            return;
        }

        const cleanPhone = (form.phone_number || '').replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length !== 12) {
            setAddError('Phone number must be exactly 12 digits.');
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

        // Use multipart/form-data so backend receives profile_picture file
        const formData = new FormData();
        const addedEmail = form.email.trim();
        const fullPhone = `${countryCode}${cleanPhone}`;
        formData.append('full_name', form.full_name.trim());
        formData.append('email', addedEmail);
        formData.append('password', form.password);
        formData.append('phone_number', fullPhone);
        if (form.user_role) formData.append('user_role', form.user_role);
        if (form.address.trim()) formData.append('address', form.address.trim());
        if (form.dob) formData.append('dob', form.dob);
        if (form.type) formData.append('user_type', form.type);
        if (form.joining_date) formData.append('doj', form.joining_date);
        if (form.department) formData.append('department', form.department);
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
                    // Send welcome mail to the newly created consultant.
                    // Backend: POST /api/employees/invite
                    api.post('/api/employees/invite', { emails: [addedEmail], message: '' }).catch(() => { });
                    setShowAddModal(false);
                    setCountryCode('+91');
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
                        profile_picture: null,
                        active: 'Active',
                    });
                    setList((prev) => [
                        ...prev,
                        {
                            id: data.id!,
                            full_name: form.full_name,
                            email: addedEmail,
                            user_role: form.user_role,
                            department: form.department,
                            phone_number: fullPhone,
                            address: form.address,
                            dob: form.dob,
                            user_type: form.type,
                            doj: form.joining_date,
                            active: form.active === 'Active' ? 'active' : 'inactive',
                            profile_picture: data.profile_picture || undefined,
                        },
                    ]);
                } else {
                    setAddError(data.message || 'Failed to add consultant.');
                }
            })
            .catch((err) => {
                console.error('Status update failed:', err);
            });
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
            <div className="sticky top-0 z-50 bg-white px-2 sm:px-4 pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-4">
                    <h2 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari truncate text-center sm:text-left"> Consultant</h2>
                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-4">
                        {canAdd && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => navigate('/bc/consultants/add')}
                                    className="inline-flex items-center gap- px-3 sm:px-4 py-2 sm:py-2 rounded-lg bg-[#DD4342] text-[#F2F2F2] transition-all shadow-lg shadow-red-100 text-[12px] sm:text-[14px]"
                                >
                                    <FiPlus className="text-xl sm:text-2xl font-bold text-[#F2F2F2] w-5 h-5 sm:w-[27px] sm:h-[27px]" />
                                    Add Consultant
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(true)}
                                    className="inline-flex items-center gap- px-3 sm:px-4 py-2 sm:py-2 rounded-lg bg-[#DD4342] text-[#F2F2F2] transition-all shadow-lg shadow-red-100 text-[12px] sm:text-[14px]"
                                >
                                    <FiPlus className="text-xl sm:text-2xl font-bold text-[#F2F2F2] w-5 h-5 sm:w-[27px] sm:h-[27px]" />
                                    Invite
                                </button>
                                <button
                                    type="button"
                                    onClick={exportCsv}
                                    className="inline-flex items-center gap- px-3 sm:px-4 py-2 sm:py-2 rounded-lg bg-[#DD4342] text-[#F2F2F2] transition-all shadow-lg shadow-red-100 text-[12px] sm:text-[14px]"
                                >
                                    <img src={exportIcon} alt="Export" className="w-5 h-5 sm:w-[27px] sm:h-[27px] object-contain" />
                                    <span className="hidden xs:inline">Export to CSV</span>
                                    <span className="xs:hidden">Export</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowInactiveModal(true)}
                                    className="inline-flex items-center px-3 sm:px-4 py-2 sm:py-2 rounded-lg bg-[#DD4342] text-[#F2F2F2] transition-all shadow-lg shadow-red-100 text-[12px] sm:text-[14px]"
                                >
                                    Manage Inactive
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Control Row: List/Grid View and Status Dropdown */}
                <div className="flex flex-col sm:flex-row justify-between sm:justify-end items-start sm:items-center gap-4 mt-4 sm:mt-6 mb-2">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-full transition-all ${viewMode === 'table' ? 'bg-[#DD4342] text-white' : 'bg-[#E0E0E0] text-[#000000]'}`}
                        >
                            <FiMenu className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('card')}
                            className={`p-2 rounded-full transition-all ${viewMode === 'card' ? 'bg-[#DD4342] text-white' : 'bg-[#E0E0E0] text-[#000000]'}`}
                        >
                            <FiGrid className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        {viewMode === 'table' && (
                            <CustomDropdown
                                options={SHOW_OPTIONS.filter(o => o !== 'Show')}
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
                            options={['All', 'Active', 'Deactive']}
                            value={statusFilter === 'All' ? 'Status' : (statusFilter === 'Deactive' ? 'Deactivate' : statusFilter)}
                            onChange={(val) => {
                                let nextStatus: any = val;
                                if (val === 'Deactivate') nextStatus = 'Deactive';
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
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 custom-scrollbar relative">
                {viewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredList.length === 0 ? (
                            <div className="col-span-full bg-white rounded-[10px] border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
                                No consultants found.
                            </div>

                        ) : (
                            filteredList.map((emp) => (
                                <div key={emp.id} className="bg-white rounded-[10px] overflow-hidden border border-slate-200 transition-all ">

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
                                            <div className={`flex items-center gap-1.5 px-2 rounded-full border shadow-sm ${isEmployeeActive(emp) ? 'bg-[#E0FFE8] border-emerald-100' : 'bg-[#FFEEEE] border-red-100'}`}>
                                                <span className={`w-2 h-2 rounded-full ${isEmployeeActive(emp) ? 'bg-[#166534]' : 'bg-[#E00100]'}`}></span>
                                                <span className={`text-[11px] font-semibold ${isEmployeeActive(emp) ? 'text-[#008F22]' : 'text-[#E00100]'}`}>
                                                    {isEmployeeActive(emp) ? 'Active' : 'Deactive'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* User Profile Info on Image (real photo if present, otherwise initials) */}
                                        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 z-10">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white overflow-hidden shrink-0 border-2 border-white shadow-sm flex items-center justify-center">
                                                {emp.profile_picture && emp.profile_picture.trim() ? (
                                                    <img
                                                        src={getProfileUrl(emp.profile_picture)}
                                                        alt={emp.full_name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-[20px] sm:text-[24px] font-semibold text-[#1A1A1A]">
                                                        {emp.full_name.charAt(0).toUpperCase() || 'U'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-[18px] sm:text-[22px] font-Gantari font-semibold text-[#F2F2F2] leading-tight tracking-tight truncate">
                                                    {emp.full_name}
                                                </h3>
                                                <p className="text-[14px] sm:text-[16px] text-[#F2F2F2] mt-1 truncate">
                                                    {emp.user_role || 'Consultant'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    <div className="p-5 space-y-5">
                                        {/* Contact Buttons */}
                                        <div className="flex flex-wrap items-center gap-3">
                                            <button 
                                                type="button"
                                                onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${emp.email}`, '_blank')}
                                                className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[12px] sm:text-[14px] font-semibold font-Gantari transition-all hover:bg-[#c6dbff]"
                                            >
                                                <img src={mailIcon} alt="Mail" className="w-4 h-4" /> Mail
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => navigate('/chat')}
                                                className="flex-[1.4] min-w-[130px] flex items-center justify-center gap-1.5 py-2 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[12px] sm:text-[14px] font-semibold font-Gantari transition-all"
                                            >
                                                <img src={messageIcon} alt="Message" className="w-4 h-4" /> Message
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => window.location.href = `tel:${emp.phone_number || ''}`}
                                                className="flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[13px] sm:text-[14px] font-semibold font-Gantari transition-all hover:bg-[#c6dbff]"
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
                                                className="flex items-center justify-center gap-2 py-2 bg-[#DD4342] text-white rounded-[5px] text-[12px] sm:text-[14px] font-Gantari"
                                            >
                                                <img src={eyeIcon} alt="View" className="w-4 h-4 sm:w-5 sm:h-5" /> View
                                            </button>

                                            {canAdd && (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/bc/consultants/edit/${emp.id}`)}
                                                    className="flex items-center justify-center gap-3 py-3 bg-[#F2F2F2] text-[#353535] rounded-[5px] text-[14px] font-Gantari"
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
                    <div className="sticky top-0 z-40 border border-[#F0F0F0] rounded-[15px] overflow-hidden bg-white">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="min-w-full border-separate border-spacing-0">
                                <thead className="sticky top-0 z-40">
                                    <tr className="bg-white">
                                        <th className="px-2 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Sl No</th>
                                        <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Emp ID</th>
                                        <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Consultant Name</th>
                                        <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">Email ID</th>
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
                                            const slNo = (currentPage - 1) * effectivePerPage + idx + 1;
                                            const slNoPadded = String(slNo).padStart(2, '0');
                                            return (
                                            <tr key={emp.id} className={idx % 2 === 1 ? 'bg-[#F9F9F9]' : 'bg-white'}>
                                                <td className="px-6 py-4 text-[15px] font-semibold font-Gantari text-[#6B6B6B]">{slNoPadded}</td>
                                                <td className="px-6 py-4 text-[15px] font-semibold font-Gantari text-[#6B6B6B] whitespace-nowrap">{emp.empid || `EMP0${emp.id + 10}`}</td>

                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center">
                                                                {emp.profile_picture && emp.profile_picture.trim() ? (
                                                                    <img
                                                                        src={getProfileUrl(emp.profile_picture)}
                                                                        alt={emp.full_name}
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <span className="text-[16px] font-semibold text-[#1A1A1A]">
                                                                        {emp.full_name.charAt(0).toUpperCase() || 'U'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={`absolute -top-1 -left-1 w-3.5 h-3.5 border-2 border-white rounded-full ${isEmployeeActive(emp) ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}></span>
                                                        </div>
                                                        <span className="text-[16px] text-center font-semibold font-Gantari text-[#353535]">{emp.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center text-[15px] font-medium font-Gantari text-[#353535]">{emp.email}</td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button 
                                                            type="button"
                                                            onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${emp.email}`, '_blank')}
                                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] hover:bg-[#c6dbff] transition-colors"
                                                        >
                                                            <img src={mailIcon} className="w-5 h-5" alt="Mail" />
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => navigate('/chat')}
                                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] hover:bg-[#c6dbff] transition-colors"
                                                        >
                                                            <img src={messageIcon} className="w-5 h-5" alt="Message" />
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => window.location.href = `tel:${emp.phone_number || ''}`}
                                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] hover:bg-[#c6dbff] transition-colors"
                                                        >
                                                            <img src={callIcon} className="w-5 h-5" alt="Call" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex justify-center">
                                                        <button className={`flex items-center justify-between gap-4 px-4 py-2.5 min-w-[140px] rounded-[5px] border font-bold text-[14px] font-Gantari ${isEmployeeActive(emp) ? 'bg-[#E0FFE8] border-[#A7F3D0] text-[#008F22]' : 'bg-[#FFEEEE] border-[#FECACA] text-[#E00100]'}`}>
                                                            {isEmployeeActive(emp) ? 'Active' : 'Deactivate'}
                                                            <FiChevronDown className="w-5 h-5 opacity-70" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )})
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>







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
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/  +/g, ' ');
                                                setForm((f: any) => ({ ...f, full_name: val }));
                                            }}

                                            className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px]  text-[14px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-1.5 font-Gantari">
                                            Phone Number <span className="text-[#DD4342]">*</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                value={countryCode}
                                                onChange={(e) => setCountryCode(e.target.value)}
                                                className="px-3 py-2.5 text-[14px] text-[#353535] bg-[#F4F4F4] border-none rounded-[5px] font-Gantari focus:outline-none"
                                            >
                                                {COUNTRY_CODES.map((code) => (
                                                    <option key={code} value={code}>{code}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Enter Phone Number"
                                                value={form.phone_number}
                                                onChange={(e) => {
                                                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 12);
                                                    setForm((f: any) => ({ ...f, phone_number: digitsOnly }));
                                                }}
                                                maxLength={12}
                                                required
                                                className="flex-1 px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px] text-[14px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-1.5 font-Gantari">Password</label>
                                        <input
                                            type="password"
                                            placeholder="Enter Password"
                                            value={form.password}
                                            onChange={(e) => setForm((f: any) => ({ ...f, password: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px]  text-[14px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[16px] font-semibold text-[#000000] mb-1.5 font-Gantari">Role</label>
                                        <div className="relative">
                                            <select
                                                value={form.user_role}
                                                onChange={(e) => setForm((f: any) => ({ ...f, user_role: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px]  text-[14px] text-[#353535] font-Gantari appearance-none cursor-pointer transition-all outline-none"
                                            >
                                                <option value="" disabled>Select Role</option>
                                                {getAllowedRoles().map((r) => (
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
                                                onChange={(e) => setForm((f: any) => ({ ...f, department: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px]  text-[14px] text-[#353535] font-Gantari appearance-none cursor-pointer transition-all outline-none"
                                            >
                                                <option value="" disabled>Select Department</option>
                                                {departments.map((dept) => (
                                                    <option key={dept} value={dept}>{dept}</option>
                                                ))}
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
                                            onChange={(e) => setForm((f: any) => ({ ...f, dob: e.target.value }))}
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
                                            onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px] focus:ring-1 focus:ring-[#D1E6FF] text-[14px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[14px] font-semibold text-[#1A1A1A] mb-1.5 font-Gantari">Type</label>
                                        <div className="relative">
                                            <select
                                                value={form.type}
                                                onChange={(e) => setForm((f: any) => ({ ...f, type: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-[#F4F4F4] border-none rounded-[5px] focus:ring-1 focus:ring-[#D1E6FF] text-[14px] text-[#353535] font-Gantari appearance-none cursor-pointer transition-all outline-none"
                                            >
                                                <option value="" disabled>Select Type</option>
                                                <option value="Trainee">Trainee</option>
                                                <option value="Consultant">Consultant</option>
                                            </select>
                                            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#353535] pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[14px] font-semibold text-[#1A1A1A] mb-1.5 font-Gantari">Date of Joining</label>
                                        <input
                                            type="date"
                                            value={form.joining_date}
                                            onChange={(e) => setForm((f: any) => ({ ...f, joining_date: e.target.value }))}
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
                                                    onChange={(e) => setForm((f: any) => ({ ...f, profile_picture: e.target.files ? e.target.files[0] : null }))}
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
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/  +/g, ' ');
                                        setForm((f: any) => ({ ...f, address: val }));
                                    }}

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
                    <div className="bg-white rounded-[15px] max-w-[873px] w-full px-4 sm:px-[30px] py-[20px] relative shadow-2xl max-h-[95vh] overflow-y-auto">
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
                    <div className="bg-white rounded-[15px] max-w-[850px] w-full px-4 sm:px-[40px] py-[20px] sm:py-[30px] relative shadow-2xl max-h-[95vh] flex flex-col">
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
                                                    {!isEmployeeActive(emp) && (
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

            {showDetailsModal && selectedEmployee && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]">
                    <div className="bg-white rounded-lg max-w-[520px] w-full px-[20px] py-[20px] relative shadow-2xl flex flex-col gap-6 font-Gantari">
                        {/* Header */}
                        <div className="flex items-center justify-center relative">
                            <button
                                type="button"
                                onClick={() => { setShowDetailsModal(false); setSelectedEmployee(null); }}
                                className="absolute left-0 p-2 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all"
                            >
                                <FiX className="w-5 h-5 font-bold" />
                            </button>
                            <h3 className="text-[26px] font-semibold text-[#020202]">View Details</h3>
                        </div>

                        {/* Profile Section */}
                        <div className="flex items-center gap-6 px-4">
                            <div className="w-[48px] h-[48px] rounded-full overflow-hidden bg-[#F4F4F4] shrink-0 border-2 border-white shadow-sm">
                                <img
                                    src={selectedEmployee.profile_picture ? getProfileUrl(selectedEmployee.profile_picture) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmployee.email}`}
                                    alt={selectedEmployee.full_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmployee.email}`;
                                    }}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h4 className="text-[18px] font-bold text-[#000000]">{selectedEmployee.full_name}</h4>
                                <p className="text-[14px] font-semibold text-[#353535]">{selectedEmployee.empid || `EMP-${String(selectedEmployee.id).padStart(4, '0')}`}</p>
                            </div>
                        </div>

                        {/* Details Table */}
                        <div className="px-8 space-y-2 pt-2">
                            {[
                                { label: 'Date of Birth', value: selectedEmployee.dob },
                                { label: 'Phone Number', value: selectedEmployee.phone_number },
                                { label: 'Email ID', value: selectedEmployee.email },
                                { label: 'User Type', value: selectedEmployee.user_type },
                                { label: 'User Role', value: selectedEmployee.user_role },
                                { label: 'Address', value: selectedEmployee.address },
                                { label: 'Joined Date', value: selectedEmployee.doj },
                                { label: 'Department', value: selectedEmployee.department },
                                { label: 'Account Number', value: selectedEmployee.accountnumber },
                                { label: 'Salary', value: selectedEmployee.salary },
                            ].map((item, idx) => (
                                <div key={idx} className="grid grid-cols-[140px_20px_1fr] text-[14px] gap-15">
                                    <span className="font-semibold text-[14px] font-Gantari text-[#020202] ">{item.label}</span>
                                    <span className="text-[#020202] text-[14px] font-Gantari text-center ">:</span>
                                    <span className="text-[#616161] text-[14px] font-Gantari font-medium break-words">{item.value}</span>
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
