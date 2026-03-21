import { useEffect, useState, useRef } from 'react';
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
                            : `px-4 py-2 bg-[#F4F4F4] rounded-[5px] text-[14px] border border-transparent focus:outline-none focus:border-[#AEACAC52] ${isOpen ? "!border-[#AEACAC52]" : ""}`
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

export default function ConsultantBC() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [list, setList] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
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
    const [selectedShow, setSelectedShow] = useState<string>("Show");
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const showTriggerRef = useRef<HTMLButtonElement>(null);
    const showMenuRef = useRef<HTMLDivElement>(null);
    const statusTriggerRef = useRef<HTMLButtonElement>(null);
    const statusMenuRef = useRef<HTMLDivElement>(null);

    const canAdd = user?.panel_type === 1;





    useEffect(() => {
        const styleTag = document.createElement('style');
        styleTag.textContent = SCROLLBAR_STYLE;
        document.head.appendChild(styleTag);
        return () => { document.head.removeChild(styleTag); };
    }, []);

    useEffect(() => {
        if (!openDropdown) return;
        function handleClickOutside(event: MouseEvent) {
            const isClickInsideShow = showMenuRef.current?.contains(event.target as Node) || showTriggerRef.current?.contains(event.target as Node);
            const isClickInsideStatus = statusMenuRef.current?.contains(event.target as Node) || statusTriggerRef.current?.contains(event.target as Node);
            
            if (!isClickInsideShow && !isClickInsideStatus) {
                setOpenDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openDropdown]);

    useEffect(() => {
        api.get<{ employees?: Employee[] }>('/api/employees').then(({ data }) => setList(data.employees ?? [])).catch(() => setList([])).finally(() => setLoading(false));
    }, []);



    const filteredList = list.filter((emp) => {
        if (statusFilter === 'All') return true;
        const isActive = (emp.active || '').toLowerCase() === 'active';
        return statusFilter === 'Active' ? isActive : !isActive;
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
    } else {
        // Default "Show" or any other value might mean "All" or a default range
        limitStart = 0;
        limitEnd = Infinity;
    }

    const displayedList = filteredList.slice(limitStart, limitEnd);

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

    function handleStatusToggle(id: number, newStatus: string) {
        const backendStatus = newStatus.toLowerCase() === 'active' ? 'active' : 'inactive';
        
        api.post('/api/employees/bulk-status', { ids: [id], action: backendStatus })
            .then((response) => {
                if (response.data?.success) {
                    setList(prev => prev.map(e => e.id === id ? { ...e, active: backendStatus } : e));
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
                    <h2 className="text-[20px] sm:text-[24px] font-Gantari font-semibold text-[#000000] tracking-tight text-center sm:text-left">Consultant</h2>
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

                    {/* Show Dropdown */}
                    {viewMode === 'table' && (
                        <div className="relative">
                            <button
                                ref={showTriggerRef}
                                type="button"
                                onClick={() => setOpenDropdown(openDropdown === "show" ? null : "show")}
                                className="inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-4 py-2 text-sm min-w-[120px]"
                            >
                                <span className="truncate font-Gantari">
                                    {selectedShow !== "Show" && selectedShow !== "All" ? (
                                        <>
                                            <span className="text-sm text-[#353535]">Show:</span>{" "}
                                            <span className="text-[#353535] font-semibold">{selectedShow}</span>
                                        </>
                                    ) : (
                                        <span className="text-[#616161]">{selectedShow}</span>
                                    )}
                                </span>
                                <img
                                    src={ArrowDown}
                                    alt="arrow"
                                    className={`ml-2 w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${openDropdown === "show" ? "rotate-180" : ""}`}
                                />
                            </button>
                            {openDropdown === "show" && (
                                <div
                                    ref={showMenuRef}
                                    className="absolute top-full right-0 z-[100] mt-1 rounded-lg border border-gray-200 bg-white shadow-lg min-w-[160px]"
                                >
                                    <div className="max-h-[220px] overflow-y-auto py-1 custom-scrollbar">
                                        {SHOW_OPTIONS.map((opt, idx) => (
                                            <button
                                                key={`${opt}-${idx}`}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedShow(opt);
                                                    setOpenDropdown(null);
                                                }}
                                                className={`block w-full px-4 py-2 text-left text-sm font-Gantari transition-colors ${selectedShow === opt ? "bg-gray-100 text-[#353535]" : "text-[#616161] hover:text-[#353535] hover:bg-gray-200"}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status filter dropdown */}
                    <div className="relative">
                        <button
                            ref={statusTriggerRef}
                            type="button"
                            onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
                            className="inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-4 py-2 text-sm min-w-[120px]"
                        >
                            <span className="truncate font-Gantari">
                                {statusFilter !== "All" ? (
                                    <>
                                        <span className="text-sm text-[#353535]">Status:</span>{" "}
                                        <span className="text-[#353535] font-semibold">{statusFilter}</span>
                                    </>
                                ) : (
                                    <span className="text-[#616161]">Status</span>
                                )}
                            </span>
                            <img
                                src={ArrowDown}
                                alt="arrow"
                                className={`ml-2 w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${openDropdown === "status" ? "rotate-180" : ""}`}
                            />
                        </button>
                        {openDropdown === "status" && (
                            <div
                                ref={statusMenuRef}
                                className="absolute top-full right-0 z-[100] mt-1 rounded-lg border border-gray-200 bg-white shadow-lg min-w-[160px]"
                            >
                                <div className="max-h-[220px] overflow-y-auto py-1 custom-scrollbar">
                                    {['All', 'Active', 'Deactive'].map((opt, idx) => (
                                        <button
                                            key={`${opt}-${idx}`}
                                            type="button"
                                            onClick={() => {
                                                setStatusFilter(opt as 'All' | 'Active' | 'Deactive');
                                                setOpenDropdown(null);
                                            }}
                                            className={`block w-full px-4 py-2 text-left text-sm font-Gantari transition-colors ${statusFilter === opt ? "bg-gray-100 text-[#353535]" : "text-[#616161] hover:text-[#353535] hover:bg-gray-200"}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 custom-scrollbar relative">
                {viewMode === 'card' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 pb-10">
                        {displayedList.length === 0 ? (
                            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
                                No consultants found.
                            </div>
                        ) : (
                            displayedList.map((emp) => (
                                <div key={emp.id} className="bg-white rounded-[15px] overflow-hidden border border-[#AEACAC52] transition-all ">
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
                                                    {emp.active === 'active' ? 'Active' : 'Deactive'}
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
                                                className="flex-[1.4] min-w-[130px] flex items-center justify-center gap-1.5 py-2 bg-[#DBE9FE] rounded-lg text-[#12141D] text-[12px] sm:text-[14px] font-semibold font-Gantari transition-all"
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
                                                className="flex items-center justify-center gap-2 py-2 bg-[#DD4342] text-white rounded-lg text-[12px] sm:text-[14px] font-Gantari"
                                            >
                                                <img src={eyeIcon} alt="View" className="w-4 h-4 sm:w-5 sm:h-5" /> View
                                            </button>
                                            {canAdd && (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/bc/consultants/edit/${emp.id}`)}
                                                    className="flex items-center justify-center gap-2 py-2 bg-[#F2F2F2] text-[#353535] rounded-lg text-[12px] sm:text-[14px] font-Gantari"
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
                                    {displayedList.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-Gantari">
                                                No consultants found.
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedList.map((emp, idx) => {
                                            const slNo = limitStart + idx + 1;
                                            return (
                                            <tr key={emp.id} className={`${idx % 2 === 1 ? 'bg-[#F2F2F2]' : 'bg-white'}`}>
                                                <td className="px-6 py-5 text-center text-[15px] font-semibold font-Gantari text-[#6B6B6B] whitespace-nowrap">{slNo}</td>
                                                <td className="px-6 py-5 text-center text-[15px] font-semibold font-Gantari text-[#6B6B6B] whitespace-nowrap">{emp.empid || `EMP0${emp.id + 10}`}</td>
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
                                                            <span className={`absolute -top-1 -left-1 w-3.5 h-3.5 border-2 border-white rounded-full ${emp.active === 'active' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}></span>
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
                                        )})
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>








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
