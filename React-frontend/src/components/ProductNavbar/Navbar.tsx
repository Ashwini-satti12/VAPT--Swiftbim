import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import api from "../../lib/api";

import swifterzLogo from "../../assets/ProductNavbarIcons/swifterzlogo.png";
import BellIcon from "../../assets/ProductNavbarIcons/bell-notification.svg";
import ProfileIcon from "../../assets/ProductNavbarIcons/Profile.svg";
import CloseIcon from "../../assets/ProductNavbarIcons/Closeicon.svg";

interface UserProfile {
    name: string;
    designation: string;
    email: string;
    phone: string;
    address: string;
}

const SEARCH_PARAM_KEY = "q";

interface NavbarProps {
    onMenuClick?: () => void;
}

export default function ProductNavbar({ onMenuClick }: NavbarProps) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [, setSearchParams] = useSearchParams();
    const [localSearch, setLocalSearch] = useState("");

    const notificationRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [profileData, setProfileData] = useState<UserProfile>({
        name: user?.full_name || "User",
        designation: "Member",
        email: user?.email || "",
        phone: "",
        address: "",
    });
    const [editData, setEditData] = useState<UserProfile>({ ...profileData });
    const [profilePicture, setProfilePicture] = useState<string | null>(null);

    const [isEditMode, setIsEditMode] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications] = useState<any[]>([]);
    const [unreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [phoneError, setPhoneError] = useState("");
    const [tempPassword, setTempPassword] = useState("");
    const [isEditingActual, setIsEditingActual] = useState(false);

    // Fetch profile on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await api.get("/api/users/profile");
                if (data) {
                    const updated: UserProfile = {
                        name: data.full_name || profileData.name,
                        designation: data.designation || "Member",
                        email: data.email || profileData.email,
                        phone: data.phone_number || "",
                        address: data.company_details || "",
                    };
                    setProfileData(updated);
                    setEditData(updated);
                }
            } catch {
                // keep defaults
            }
        };
        fetchProfile();
        const saved = localStorage.getItem("userProfilePicture");
        if (saved) setProfilePicture(saved);
    }, []);

    // Close notification dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(e.target as Node))
                setShowNotifications(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                if (localSearch.trim()) next.set(SEARCH_PARAM_KEY, localSearch.trim());
                else next.delete(SEARCH_PARAM_KEY);
                return next;
            },
            { replace: true }
        );
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
        if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB."); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            setProfilePicture(result);
            localStorage.setItem("userProfilePicture", result);
        };
        reader.readAsDataURL(file);
    };

    const handleProfileSave = async () => {
        if (editData.phone && !/^\d{10}$/.test(editData.phone.replace(/\D/g, ""))) {
            setPhoneError("Please enter a valid phone number.");
            return;
        }
        setPhoneError("");
        setIsLoading(true);
        try {
            await api.patch("/api/users/profile", {
                full_name: editData.name,
                designation: editData.designation,
                phone_number: editData.phone,
                company_details: editData.address,
            });
            // If password was filled in, save it too
            if (tempPassword) {
                if (tempPassword.length < 6) {
                    alert("Password must be at least 6 characters.");
                    setIsLoading(false);
                    return;
                }
                await api.patch("/api/users/profile/password", { password: tempPassword });
                setTempPassword("");
            }
            setProfileData({ ...editData });
            setIsEditingActual(false);
        } catch {
            alert("Failed to update profile. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        setShowLogoutConfirm(false);
        const userType = user?.user_type;
        await logout();
        navigate(userType === "client" ? "/client-login" : "/login");
    };

    const firstName = (profileData.name || "User").split(" ")[0];

    return (
        <>
            {/* ── Navbar bar ── */}
            <header
                className="flex items-center justify-between h-16 sm:h-20 w-full shrink-0 px-4 sm:px-6 lg:px-8"
            >
                {/* LEFT: Hamburger + Logo */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {/* Mobile hamburger */}
                    <button
                        className="lg:hidden p-1 text-slate-500"
                        onClick={onMenuClick}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <img src={swifterzLogo} alt="SWIFTERZ" className="h-10 sm:h-14 w-auto object-contain" />
                </div>

                {/* RIGHT: Search + Bell + Greeting + Avatar */}
                <div className="flex items-center gap-3 sm:gap-5 shrink-0">

                    {/* Search — hidden on xs, visible on sm+ */}
                    <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center">
                        <div
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-[#8B8B8B] bg-[#FFFFFF] w-[160px] sm:w-[200px] focus-within:border-slate-400 transition-colors shadow-sm"
                        >
                            <MagnifyingGlassIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
                            <input
                                type="text"
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                placeholder="Search"
                                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none min-w-0"
                            />
                        </div>
                    </form>

                    {/* Bell */}
                    <div ref={notificationRef} className="relative">
                        <button
                            onClick={() => setShowNotifications((p) => !p)}
                            className="relative p-1 text-slate-800 hover:text-black transition-colors"
                        >
                            <img src={BellIcon} alt="Notifications" className="w-5 h-5 sm:w-6 sm:h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white">
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 top-10 w-64 sm:w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50">
                                <div className="px-4 py-3 border-b border-slate-100">
                                    <p className="font-semibold text-slate-800 text-sm">Notifications</p>
                                </div>
                                {notifications.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-slate-400 text-sm">No new notifications</div>
                                ) : (
                                    notifications.map((n: any, i: number) => (
                                        <div key={i} className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50 text-sm text-slate-700">
                                            {n.message}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Greeting + Avatar */}
                    <div
                        className="flex items-center gap-2 sm:gap-4 cursor-pointer select-none"
                        onClick={() => { setIsEditMode(true); setIsEditingActual(false); }}
                    >
                        <span className="hidden sm:block text-sm sm:text-base font-medium text-slate-800 whitespace-nowrap">
                            Hello, {firstName}!
                        </span>
                        {profilePicture ? (
                            <img
                                src={profilePicture}
                                alt="avatar"
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shadow-sm bg-blue-100"
                            />
                        ) : (
                            <img src={ProfileIcon} alt="profile" className="w-8 h-8 sm:w-10 sm:h-10" />
                        )}
                    </div>

                </div>
            </header>

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            {/* ── Profile Modal (View & Edit) ── */}
            {isEditMode && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-end bg-black/40 backdrop-blur-sm p-4 sm:p-8"
                    onClick={() => { setIsEditMode(false); setIsEditingActual(false); }}>
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-[490px] relative p-8 transition-all animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
                        {/* Close button at top-left */}
                        <button
                            onClick={() => { setIsEditMode(false); setIsEditingActual(false); }}
                            className="absolute top-6 left-6 p-2 rounded-lg bg-[#F4F4F4] hover:bg-slate-200 transition-colors"
                        >
                            <img src={CloseIcon} alt="Close" className="w-4 h-4" />
                        </button>

                        <div className="flex flex-col items-center">
                            {/* Avatar Section */}
                            <div className="relative group mb-4">
                                <div
                                    className={`w-28 h-28 rounded-full overflow-hidden bg-[#87B2D2] flex flex-col items-center justify-center shadow-sm relative ${isEditingActual ? 'cursor-pointer' : ''}`}
                                    onClick={() => isEditingActual && fileInputRef.current?.click()}
                                >
                                    {profilePicture ? (
                                        <img src={profilePicture} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        isEditingActual ? (
                                            <div className="flex flex-col items-center text-white">
                                                <svg className="w-10 h-10 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Edit</span>
                                            </div>
                                        ) : (
                                            <svg className="w-20 h-20 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                            </svg>
                                        )
                                    )}
                                    {isEditingActual && profilePicture && (
                                        <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-8 h-8 text-white mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            <span className="text-[10px] text-white font-bold uppercase">Edit</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Name and Designation */}
                            <div className="text-center mb-8 w-full px-4">
                                {isEditingActual ? (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={editData.name}
                                            onChange={(e) => setEditData(p => ({ ...p, name: e.target.value }))}
                                            placeholder="Type Name..."
                                            className="w-full bg-[#F2F2F2] border border-[#AEACAC52] rounded-[10px] py-2 px-3 text-center text-[20px] font-bold text-[#020202] focus:ring-0 outline-none placeholder:text-[#AEACAC] font-gantari"
                                        />
                                        <input
                                            type="text"
                                            value={editData.designation}
                                            onChange={(e) => setEditData(p => ({ ...p, designation: e.target.value }))}
                                            placeholder="Enter Designation"
                                            className="w-full bg-[#F2F2F2] border border-[#AEACAC52] rounded-[8px] py-1.5 px-3 text-center text-[15px] font-medium text-[#353535] focus:ring-0 outline-none placeholder:text-[#AEACAC] font-gantari"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-[26px] font-bold text-[#020202] font-gantari leading-tight uppercase">
                                            Hello, {profileData.name}!
                                        </h3>
                                        <p className="text-[18px] text-[#353535] font-medium mt-1">
                                            {profileData.designation}
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Details Card */}
                            <div className="w-full bg-white rounded-2xl border border-[#AEACAC52] p-6 space-y-4 mb-8">
                                <div className="grid grid-cols-[100px_20px_1fr] items-center text-[15px]">
                                    <label className="font-semibold text-[#1A1A1A] font-gantari">Email ID</label>
                                    <span className="text-[#353535] font-bold">:</span>
                                    {isEditingActual ? (
                                        <input
                                            type="email"
                                            value={editData.email}
                                            readOnly
                                            placeholder="Enter email id"
                                            className="w-full bg-[#F2F2F2] border border-[#AEACAC52] rounded-[5px] px-3 py-1.5 text-[#353535] font-medium focus:ring-0 outline-none placeholder:text-[#AEACAC]"
                                        />
                                    ) : (
                                        <span className="text-[#353535] font-medium truncate">{profileData.email}</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-[100px_20px_1fr] items-center text-[15px]">
                                    <label className="font-semibold text-[#1A1A1A] font-gantari">Phone Num</label>
                                    <span className="text-[#353535] font-bold">:</span>
                                    {isEditingActual ? (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={editData.phone}
                                                onChange={(e) => setEditData(p => ({ ...p, phone: e.target.value }))}
                                                placeholder="Enter Phone Num"
                                                className="w-full bg-[#F2F2F2] border border-[#AEACAC52] rounded-[5px] px-3 py-1.5 text-[#353535] font-medium focus:ring-0 outline-none placeholder:text-[#AEACAC]"
                                            />
                                            {phoneError && <p className="text-[10px] text-red-500 absolute -bottom-4 left-0">{phoneError}</p>}
                                        </div>
                                    ) : (
                                        <span className="text-[#353535] font-medium">{profileData.phone}</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-[100px_20px_1fr] items-start text-[15px]">
                                    <label className="font-semibold text-[#1A1A1A] font-gantari pt-0.5">Address</label>
                                    <span className="text-[#353535] font-bold pt-0.5">:</span>
                                    {isEditingActual ? (
                                        <textarea
                                            rows={2}
                                            value={editData.address}
                                            onChange={(e) => setEditData(p => ({ ...p, address: e.target.value }))}
                                            placeholder="Enter Address"
                                            className="w-full bg-[#F2F2F2] border border-[#AEACAC52] rounded-[5px] px-3 py-1.5 text-[#353535] font-medium focus:ring-0 outline-none placeholder:text-[#AEACAC] resize-none leading-relaxed"
                                        />
                                    ) : (
                                        <span className={`font-medium ${profileData.address ? 'text-[#353535]' : 'text-slate-300'}`}>
                                            {profileData.address || 'Enter Address'}
                                        </span>
                                    )}
                                </div>

                                <hr className="border-[#AEACAC33]" />

                                <div className="grid grid-cols-[100px_20px_1fr] items-center text-[15px]">
                                    <label className="font-semibold text-[#1A1A1A] font-gantari">Password</label>
                                    <span className="text-[#353535] font-bold">:</span>
                                    {isEditingActual ? (
                                        <input
                                            type="password"
                                            value={tempPassword}
                                            onChange={(e) => setTempPassword(e.target.value)}
                                            placeholder="********"
                                            className="w-full bg-[#F2F2F2] border border-[#AEACAC52] rounded-[5px] px-3 py-1.5 text-[#353535] font-medium focus:ring-0 outline-none placeholder:text-[#AEACAC]"
                                        />
                                    ) : (
                                        <span className="text-[#353535] font-medium tracking-widest">********</span>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-center gap-6 w-full">
                                {isEditingActual ? (
                                    <>
                                        <button
                                            onClick={() => setIsEditingActual(false)}
                                            className="px-10 py-2.5 bg-[#EAEAEA] text-[#020202] rounded-[10px] font-bold text-[15px] transition-all hover:bg-gray-200"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            onClick={handleProfileSave}
                                            disabled={isLoading}
                                            className="px-10 py-2.5 bg-[#DBE9FE] text-[#101827] rounded-[10px] font-bold text-[15px] transition-all hover:bg-[#c6dbff] disabled:opacity-50"
                                        >
                                            {isLoading ? "Updating..." : "Update"}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsEditMode(false); setTimeout(() => setShowLogoutConfirm(true), 150); }}
                                            className="px-10 py-2.5 bg-[#FFD9D9] text-[#E00100] rounded-[10px] font-bold text-[15px] transition-all hover:bg-rose-200"
                                        >
                                            Logout
                                        </button>
                                        <button
                                            onClick={() => setIsEditingActual(true)}
                                            className="px-10 py-2.5 bg-[#DBE9FE] text-[#101827] rounded-[10px] font-bold text-[15px] transition-all hover:bg-[#c6dbff]"
                                        >
                                            Update
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Logout Confirm (inline) ── */}
            {showLogoutConfirm && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setShowLogoutConfirm(false)}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative" onClick={(e) => e.stopPropagation()}>
                        {/* X Close Button - top left */}
                        <button
                            onClick={() => setShowLogoutConfirm(false)}
                            className="absolute top-5 left-5 w-9 h-9 flex items-center justify-center bg-[#F2F2F2] rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <img src={CloseIcon} alt="Close" className="w-4 h-4" />
                        </button>

                        {/* Centered message */}
                        <p className="text-center text-[17px] font-bold text-[#1A1A1A] font-gantari mt-6 mb-10">
                            Are you sure you want to log out?
                        </p>

                        {/* Centered buttons */}
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="px-8 py-2.5 text-[15px] text-[#353535] rounded-lg font-semibold bg-[#F0F0F0] transition-colors min-w-[110px]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-8 py-2.5 text-[15px] bg-[#FFE5E5] text-[#E00100] rounded-lg font-semibold transition-colors min-w-[110px]"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}