import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import api from "../../lib/api";

import swifterzLogo from "../../assets/ProductNavbarIcons/swifterzlogo.png";

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
    const profileRef = useRef<HTMLDivElement>(null);
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

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications] = useState<any[]>([]);
    const [unreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [phoneError, setPhoneError] = useState("");
    const [tempPassword, setTempPassword] = useState("");

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

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(e.target as Node))
                setShowNotifications(false);
            if (profileRef.current && !profileRef.current.contains(e.target as Node))
                setIsProfileOpen(false);
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
            setProfileData({ ...editData });
            setIsEditMode(false);
        } catch {
            alert("Failed to update profile. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordSave = async () => {
        if (!tempPassword || tempPassword.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }
        try {
            await api.patch("/api/users/profile/password", { password: tempPassword });
            alert("Password updated successfully.");
            setTempPassword("");
        } catch {
            alert("Failed to update password.");
        }
    };

    const handleLogout = async () => {
        setShowLogoutConfirm(false);
        setIsProfileOpen(false);
        const userType = user?.user_type;
        await logout();
        navigate(userType === "client" ? "/client-login" : "/login");
    };

    const firstName = (profileData.name || "User").split(" ")[0];
    const initials = (profileData.name || "U")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <>
            {/* ── Navbar bar ── */}
            <header className="flex items-center justify-between h-20 w-full shrink-0 px-8 bg-transparent">
                {/* LEFT: Logo */}
                <div className="flex items-center gap-4 shrink-0">
                    {/* Mobile hamburger */}
                    <button
                        className="lg:hidden p-1 text-slate-500"
                        onClick={onMenuClick}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <img src={swifterzLogo} alt="SWIFTERZ" className="h-14 w-auto object-contain" />
                </div>

                {/* CENTER: Search */}
                <form onSubmit={handleSearchSubmit} className="flex-1 flex justify-end max-w-md px-4">
                    <div
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-300 bg-white w-full max-w-[200px] focus-within:border-slate-400 transition-colors shadow-sm"
                    >
                        <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 shrink-0" />
                        <input
                            type="text"
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            placeholder="Search"
                            className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none min-w-0"
                        />
                    </div>
                </form>

                {/* RIGHT: Bell + Greeting + Avatar */}
                <div className="flex items-center gap-6 shrink-0 ml-4">
                    {/* Bell */}
                    <div ref={notificationRef} className="relative">
                        <button
                            onClick={() => setShowNotifications((p) => !p)}
                            className="relative p-1 text-slate-800 hover:text-black transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 015.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white">
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50">
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
                        ref={profileRef}
                        className="relative flex items-center gap-4 cursor-pointer select-none"
                        onClick={() => setIsProfileOpen((p) => !p)}
                    >
                        <span className="text-base font-medium text-slate-800 whitespace-nowrap">
                            Hello, {firstName}!
                        </span>
                        {profilePicture ? (
                            <img
                                src={profilePicture}
                                alt="avatar"
                                className="w-10 h-10 rounded-full object-cover shadow-sm bg-blue-100"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-[#87B2D2] flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                                <svg className="w-7 h-7 text-white/90" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                            </div>
                        )}

                        {/* Profile dropdown */}
                        {isProfileOpen && (
                            <div
                                className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Profile header */}
                                <div className="flex items-center gap-3 px-4 py-4 bg-slate-50 border-b border-slate-100">
                                    <div
                                        className="relative cursor-pointer group shrink-0"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {profilePicture ? (
                                            <img src={profilePicture} alt="avatar" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-slate-400 flex items-center justify-center text-white font-semibold text-lg border-2 border-white shadow">
                                                {initials}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-[10px] font-medium">Edit</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-800 text-sm truncate">{profileData.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{profileData.designation}</p>
                                        <p className="text-xs text-slate-400 truncate">{profileData.email}</p>
                                    </div>
                                    <button
                                        onClick={() => { setIsEditMode(true); setIsProfileOpen(false); }}
                                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Logout */}
                                <div className="p-2">
                                    <button
                                        onClick={() => { setShowLogoutConfirm(true); setIsProfileOpen(false); }}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[#DD4342] hover:bg-red-50 text-sm font-medium transition-colors"
                                    >
                                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Log Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            {/* ── Edit Profile Modal ── */}
            {isEditMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-800 text-lg">Edit Profile</h3>
                            <button onClick={() => setIsEditMode(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {[
                                { label: "Full Name", key: "name", type: "text" },
                                { label: "Designation", key: "designation", type: "text" },
                                { label: "Email", key: "email", type: "email", disabled: true },
                                { label: "Phone", key: "phone", type: "text" },
                                { label: "Address", key: "address", type: "text" },
                            ].map(({ label, key, type, disabled }) => (
                                <div key={key}>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                                    <input
                                        type={type}
                                        value={editData[key as keyof UserProfile]}
                                        onChange={(e) => setEditData((p) => ({ ...p, [key]: e.target.value }))}
                                        disabled={disabled}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-[#DD4342] transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                                    />
                                    {key === "phone" && phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                                </div>
                            ))}

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={tempPassword}
                                    onChange={(e) => setTempPassword(e.target.value)}
                                    placeholder="Leave blank to keep current"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-[#DD4342] transition-colors"
                                />
                                {tempPassword && (
                                    <button onClick={handlePasswordSave} className="mt-1.5 text-xs text-[#DD4342] font-medium hover:underline">
                                        Save Password
                                    </button>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setIsEditMode(false)}
                                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors border border-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleProfileSave}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-sm bg-[#DD4342] text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
                                >
                                    {isLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Logout Confirm (inline) ── */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Log Out</h3>
                        <p className="text-sm text-slate-500 mb-6">Are you sure you want to log out?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg font-medium border border-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 text-sm bg-[#DD4342] text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
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
