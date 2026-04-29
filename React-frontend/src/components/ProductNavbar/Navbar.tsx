import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import api from "../../lib/api";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";

import swifterzLogo from "../../assets/ProductNavbarIcons/swifterzlogo.png";
import BellIcon from "../../assets/ProductNavbarIcons/bell-notification.svg";
import ProfileIcon from "../../assets/ProductNavbarIcons/Profile.svg";
import CloseIcon from "../../assets/ProductNavbarIcons/close button.svg";


interface UserProfile {
  id?: number | string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  address: string;
}

const SEARCH_PARAM_KEY = "q";
const LEGACY_SEARCH_PARAM_KEY = "search";

interface NavbarProps {
  onMenuClick?: () => void;
}

interface NotificationItem {
  id: string;
  message: string;
  createdAt?: string;
  type: "general" | "task";
  raw?: {
    id?: number;
    type?: string;
    entity_type?: string | null;
    entity_id?: number | null;
    project_id?: number | null;
  };
}

export default function ProductNavbar({ onMenuClick }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState("");

  const notificationRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState<UserProfile>({
    id: user?.id,
    name: user?.full_name || "User",
    designation: user?.user_role || "Member",
    email: user?.email || "",
    phone: "",
    address: "",
  });
  const [editData, setEditData] = useState<UserProfile>({ ...profileData });
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [_isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isEditingActual, setIsEditingActual] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get("/api/profile");
        if (data) {
          const updated: UserProfile = {
            id: data.id || profileData.id,
            name: data.full_name || profileData.name,
            designation: data.user_role || "Member",
            email: data.email || profileData.email,
            phone: data.phone_number || "",
            address: data.address || "",
          };
          setProfileData(updated);
          setEditData(updated);
          if (data.profile_picture) {
            const baseUrl = getGlobalProfileUrl(
              data.id || user?.id,
              data.profile_picture,
              user?.user_type
            );
            const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
            setProfilePicture(url);
            localStorage.setItem("userProfilePicture", url);
          } else {
            setProfilePicture(null);
            localStorage.removeItem("userProfilePicture");
          }
        }
      } catch {
        // keep defaults if profile endpoint fails
      }
    };
    fetchProfile();
    const saved = localStorage.getItem("userProfilePicture");
    if (saved) setProfilePicture(saved);
  }, []);

  // Fetch notifications for all roles (general + task-based)
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsNotificationsLoading(true);
      try {
        const [generalRes, taskRes] = await Promise.allSettled([
          api.get("/api/notifications"),
          api.get("/api/notifications/tasks"),
        ]);

        const items: NotificationItem[] = [];

        if (generalRes.status === "fulfilled") {
          const data = generalRes.value.data as {
            notifications?: {
              id: number;
              title?: string;
              message?: string;
              created_at?: string;
              type?: string;
              entity_type?: string | null;
              entity_id?: number | null;
              project_id?: number | null;
            }[];
          };
          (data.notifications || []).forEach((n) => {
            items.push({
              id: `g-${n.id}`,
              message: n.message || n.title || "Notification",
              createdAt: n.created_at,
              type: "general",
              raw: {
                id: n.id,
                type: n.type,
                entity_type: n.entity_type ?? null,
                entity_id: n.entity_id ?? null,
                project_id: n.project_id ?? null,
              },
            });
          });
        }

        if (taskRes.status === "fulfilled") {
          const data = taskRes.value.data as {
            notifications?: {
              taskId: number;
              taskName?: string;
              message?: string;
              date?: string;
              uploader?: string;
            }[];
          };
          (data.notifications || []).forEach((t) => {
            const base = t.taskName || "Task update";
            const extra = t.message || t.date || "";
            items.push({
              id: `t-${t.taskId}`,
              message: extra ? `${base} - ${extra}` : base,
              createdAt: t.date,
              type: "task",
              raw: {
                entity_type: "task",
                entity_id: t.taskId,
              },
            });
          });
        }

        // Sort by createdAt if available (newest first)
        items.sort((a, b) => {
          if (!a.createdAt && !b.createdAt) return 0;
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

        setNotifications(items);
        setUnreadCount(items.length);
      } catch (err) {
        console.error("Failed to load notifications", err);
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setIsNotificationsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const getPrefix = () => {
    const seg = (location.pathname || "").split("/").filter(Boolean)[0] || "";
    // PM routes have no prefix
    if (["td", "bl", "bc", "bm", "v"].includes(seg)) return `/${seg}`;
    return "";
  };

  const openNotification = async (n: NotificationItem) => {
    const prefix = getPrefix();
    const et = n.raw?.entity_type;
    const eid = n.raw?.entity_id;
    const projectId = n.raw?.project_id;

    // Mark as read (general notifications only)
    try {
      if (n.id.startsWith("g-") && n.raw?.id) {
        await api.post(`/api/notifications/${n.raw.id}/read`);
      } else if (et === "task" && eid) {
        // task notification read endpoint exists
        await api.post(`/api/notifications/tasks/${eid}/read`);
      }
    } catch {
      // ignore
    }

    setShowNotifications(false);
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    setUnreadCount((c) => Math.max(0, c - 1));

    if (et === "project") {
      // open projects module with deep-link query param (supported in multiple roles)
      navigate(`${prefix || ""}/projects${prefix ? "" : ""}?projectId=${eid ?? projectId ?? ""}`);
      return;
    }

    if (et === "task" && eid) {
      if (!prefix) {
        navigate(`/tasks/${eid}`);
      } else {
        // role-specific tasks list
        navigate(`${prefix}/mytasks`);
      }
      return;
    }

    if (et === "leave") {
      // management roles have manage-leave routes; otherwise go to leave
      if (!prefix) navigate(`/pm/manage-leave`);
      else if (prefix === "/td") navigate(`/td/manage-leave`);
      else if (prefix === "/bl") navigate(`/bl/manage-leave`);
      else if (prefix === "/bc") navigate(`/bc/manage-leave`);
      else if (prefix === "/bm") navigate(`/bm/manage-leave`);
      else navigate(`/leave`);
      return;
    }

    if (et === "bidding") {
      if (prefix === "/td") navigate(`/td/bidding`);
      else if (prefix === "/v") navigate(`/v/opportunities`);
      else navigate(`/td/bidding`);
      return;
    }

    if (et === "proposal") {
      if (prefix === "/td") navigate(`/td/proposals`);
      else if (prefix === "/v") navigate(`/v/proposals`);
      else navigate(`/td/proposals`);
      return;
    }
  };

  const clearAllNotifications = async () => {
    try {
      await Promise.allSettled([
        api.post("/api/notifications/read-all"),
        api.post("/api/notifications/tasks/read-all"),
      ]);
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target as Node)
      )
        setShowNotifications(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    const value = localSearch.trim().toLowerCase();
    if (value) {
      next.set(SEARCH_PARAM_KEY, value);
      next.set(LEGACY_SEARCH_PARAM_KEY, value);
    } else {
      next.delete(SEARCH_PARAM_KEY);
      next.delete(LEGACY_SEARCH_PARAM_KEY);
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const currentSearch =
      searchParams.get(SEARCH_PARAM_KEY) ||
      searchParams.get(LEGACY_SEARCH_PARAM_KEY) ||
      "";
    setLocalSearch(currentSearch.toLowerCase());
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    const normalized = value.toLowerCase();
    setLocalSearch(normalized);

    const next = new URLSearchParams(searchParams);
    const trimmed = normalized.trim();
    if (trimmed) {
      next.set(SEARCH_PARAM_KEY, trimmed);
      next.set(LEGACY_SEARCH_PARAM_KEY, trimmed);
    } else {
      next.delete(SEARCH_PARAM_KEY);
      next.delete(LEGACY_SEARCH_PARAM_KEY);
    }
    setSearchParams(next, { replace: true });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB.");
      return;
    }

    setSelectedFile(file); // Store the file for upload

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setProfilePicture(result);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async () => {
    if (editData.phone && !/^\d{10,15}$/.test(editData.phone.replace(/\D/g, ""))) {
      setPhoneError("Please enter a valid phone number (10-15 digits).");
      return;
    }

    // Only validate password if the user is trying to change it
    // Do not trim passwords; spaces can be valid characters.
    const curPass = currentPassword || "";
    const newPass = newPassword || "";

    if (newPass) {
      if (!curPass) {
        setPasswordError("Please enter current password to change to a new one.");
        return;
      }
      if (newPass.length < 6) {
        setPasswordError("New password must be at least 6 characters.");
        return;
      }
    }

    setPhoneError("");
    setPasswordError("");
    setIsLoading(true);
    try {
      let passwordUpdateFailed = false;

      // Use FormData for multipart/form-data (required for file upload)
      const formData = new FormData();
      formData.append("full_name", editData.name);
      formData.append("phone_number", editData.phone);
      formData.append("address", editData.address);
      formData.append("role", editData.designation);
      if (selectedFile) {
        formData.append("profile_picture", selectedFile);
      }

      // Update basic profile fields
      const { data } = await api.put("/api/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Update password if provided
      if (curPass && newPass) {
        try {
          await api.post("/api/profile/change-password", {
            current_password: curPass,
            new_password: newPass,
          });
          setCurrentPassword("");
          setNewPassword("");
        } catch (e: any) {
          // Keep edit mode open so user can correct password inputs.
          const msg =
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            "Password update failed. Please check current password.";
          setPasswordError(String(msg));
          passwordUpdateFailed = true;
        }
      }

      setProfileData({ ...editData });

      // If a new profile picture was uploaded, the backend returns the filename
      const empId = editData.id || user?.id;
      if (data && data.profile_picture && empId) {
        const baseUrl = getGlobalProfileUrl(
          empId,
          data.profile_picture,
          user?.user_type
        );
        const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
        setProfilePicture(url);
        localStorage.setItem("userProfilePicture", url);
      }

      setSelectedFile(null);
      if (!passwordUpdateFailed) {
        setIsEditingActual(false);
      }
    } catch (err) {
      console.error("Profile update error:", err);
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
      <header className="flex items-center justify-between h-16 sm:h-20 w-full shrink-0 px-4 sm:px-6 lg:px-8">
        {/* LEFT: Hamburger + Logo */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-1 text-slate-500 cursor-pointer"
            onClick={onMenuClick}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <img
            src={swifterzLogo}
            alt="SWIFTERZ"
            className="h-10 sm:h-14 w-auto object-contain"
          />
        </div>

        {/* RIGHT: Search + Bell + Greeting + Avatar */}
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          {/* Search — hidden on xs, visible on sm+ */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden sm:flex items-center"
          >
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-[#8B8B8B] bg-[#FFFFFF] w-[160px] sm:w-[200px] focus-within:border-slate-400 transition-colors shadow-sm">
              <MagnifyingGlassIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none min-w-0"
              />
            </div>
          </form>

          {/* Bell */}
          <div ref={notificationRef} className="relative">
            <button
              onClick={() => setShowNotifications((p) => !p)}
              className="relative p-1 text-slate-800 hover:text-black transition-colors cursor-pointer"
            >
              <img
                src={BellIcon}
                alt="Notifications"
                className="w-5 h-5 sm:w-6 sm:h-6"
              />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-10 w-64 sm:w-72 max-h-[min(70vh,22rem)] flex flex-col bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                <div className="shrink-0 px-4 py-3 border-b border-slate-100 bg-white">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800 text-sm">
                      Notifications
                    </p>
                    {notifications.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearAllNotifications();
                        }}
                        className="text-[12px] font-semibold text-[#DD4342] hover:text-[#c43a39] cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-slate-400 text-sm shrink-0">
                    No new notifications
                  </div>
                ) : (
                  <div className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184)_rgb(241_245_249)]">
                    {notifications.map((n: any, i: number) => (
                      <div
                        key={n.id ?? i}
                        onClick={() => openNotification(n)}
                        className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 text-sm text-slate-700 cursor-pointer"
                      >
                        {n.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Greeting + Avatar */}
          <div
            className="flex items-center gap-2 sm:gap-4 cursor-pointer select-none"
            onClick={() => {
              setIsEditMode(true);
              setIsEditingActual(false);
            }}
          >
            <span className="hidden sm:block text-[18px] font-medium text-slate-800 whitespace-nowrap">
              Hello, {firstName}!
            </span>
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="avatar"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shadow-sm bg-blue-100"
              />
            ) : (
              <img
                src={ProfileIcon}
                alt="profile"
                className="w-8 h-8 sm:w-10 sm:h-10"
              />
            )}
          </div>
        </div>
      </header>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ── Profile Modal (View & Edit) ── */}
      {isEditMode && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-end bg-black/40 backdrop-blur-sm p-3 sm:p-4"
          onClick={() => {
            setIsEditMode(false);
            setIsEditingActual(false);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-[min(420px,calc(100vw-1.5rem))] max-h-[calc(100vh-1.5rem)] overflow-y-auto relative p-5 sm:p-6 transition-all animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button at top-left */}
            <button
              onClick={() => {
                setIsEditMode(false);
                setIsEditingActual(false);
              }}
              className="absolute top-4 left-4 p-2 rounded-lg bg-[#F2F2F2] shrink-0 cursor-pointer"
            >
              <img src={CloseIcon} alt="Close" className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center">
              {/* Avatar Section */}
              <div className="relative group mb-3">
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-[#87B2D2] flex flex-col items-center justify-center shadow-sm relative shrink-0 ${isEditingActual ? "cursor-pointer" : ""}`}
                  onClick={() =>
                    isEditingActual && fileInputRef.current?.click()
                  }
                >
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : isEditingActual ? (
                    <div className="flex flex-col items-center text-white">
                      <svg
                        className="w-10 h-10 mb-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Edit
                      </span>
                    </div>
                  ) : (
                    <svg
                      className="w-20 h-20 text-white/90"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  )}
                  {isEditingActual && profilePicture && (
                    <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg
                        className="w-8 h-8 text-white mb-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      <span className="text-[10px] text-white font-bold uppercase">
                        Edit
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Name and Designation */}
              <div className="text-center mb-5 w-full px-2 min-w-0">
                {isEditingActual ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Type Name..."
                      className="w-full bg-[#F2F2F2] border border-[#AEACAC52] rounded-[10px] py-2 px-3 text-center text-[20px] font-bold text-[#020202] focus:ring-0 outline-none placeholder:text-[#AEACAC] font-gantari"
                    />
                    <input
                      type="text"
                      value={editData.designation}
                      onChange={(e) =>
                        setEditData((p) => ({
                          ...p,
                          designation: e.target.value,
                        }))
                      }
                      placeholder="Enter Designation"
                      className="w-full bg-[#F2F2F2] border border-[#AEACAC52] rounded-[8px] py-1.5 px-3 text-center text-[15px] font-medium text-[#353535] focus:ring-0 outline-none placeholder:text-[#AEACAC] font-gantari"
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="text-[18px] font-bold text-[#020202] font-gantari leading-tight uppercase break-words">
                      Hello, {profileData.name}!
                    </h3>
                    <p className="text-[14px] sm:text-[16px] text-[#353535] font-medium mt-1 break-words">
                      {profileData.designation}
                    </p>
                  </>
                )}
              </div>

              {/* Details Card */}
              <div className="w-full min-w-0 bg-white rounded-2xl border border-[#AEACAC52] p-4 sm:p-5 space-y-3 mb-5">
                <div className="grid grid-cols-[90px_1ch_1fr] sm:grid-cols-[100px_20px_1fr] items-center text-[14px] gap-x-2">
                  <label className="font-semibold text-[#1A1A1A] font-gantari">
                    Email ID
                  </label>
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
                    <span className="text-[#353535] font-medium break-all">
                      {profileData.email}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[90px_1ch_1fr] sm:grid-cols-[100px_20px_1fr] items-center text-[14px] gap-x-2">
                  <label className="font-semibold text-[#1A1A1A] font-gantari">
                    Phone Num
                  </label>
                  <span className="text-[#353535] font-bold">:</span>
                  {isEditingActual ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={editData.phone}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, phone: e.target.value }))
                        }
                        placeholder="Enter Phone Num"
                        className="w-full bg-[#F2F2F2] border border-[#AEACAC52] rounded-[5px] px-3 py-1.5 text-[#353535] font-medium focus:ring-0 outline-none placeholder:text-[#AEACAC]"
                      />
                      {phoneError && (
                        <p className="text-[10px] text-red-500 absolute -bottom-4 left-0">
                          {phoneError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-[#353535] font-medium">
                      {profileData.phone}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[90px_1ch_1fr] sm:grid-cols-[100px_20px_1fr] items-start text-[14px] gap-x-2">
                  <label className="font-semibold text-[#1A1A1A] font-gantari pt-0.5 shrink-0">
                    Address
                  </label>
                  <span className="text-[#353535] font-bold pt-0.5">:</span>
                  {isEditingActual ? (
                    <textarea
                      rows={2}
                      value={editData.address}
                      onChange={(e) =>
                        setEditData((p) => ({ ...p, address: e.target.value }))
                      }
                      placeholder="Enter Address"
                      className="w-full min-w-0 bg-[#F2F2F2] border border-[#AEACAC52] rounded-[5px] px-3 py-1.5 text-[#353535] font-medium focus:ring-0 outline-none placeholder:text-[#AEACAC] resize-none leading-relaxed"
                    />
                  ) : (
                    <span
                      className={`font-medium break-words min-w-0 ${profileData.address ? "text-[#353535]" : "text-slate-300"}`}
                    >
                      {profileData.address || "Enter Address"}
                    </span>
                  )}
                </div>

                <hr className="border-[#AEACAC33]" />

                <div className="grid grid-cols-[90px_1ch_1fr] sm:grid-cols-[100px_20px_1fr] items-start text-[14px] gap-x-2">
                  <label className="font-semibold text-[#1A1A1A] font-gantari pt-0.5 shrink-0">
                    Password
                  </label>
                  <span className="text-[#353535] font-bold pt-0.5">:</span>
                  {isEditingActual ? (
                    <div className="space-y-2 w-full">
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        autoComplete="current-password"
                        className="w-full bg-[#F2F2F2] border border-[#AEACAC52] rounded-[5px] px-3 py-1.5 text-[#353535] font-medium focus:ring-0 outline-none placeholder:text-[#AEACAC]"
                      />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        autoComplete="new-password"
                        className="w-full bg-[#F2F2F2] border border-[#AEACAC52] rounded-[5px] px-3 py-1.5 text-[#353535] font-medium focus:ring-0 outline-none placeholder:text-[#AEACAC]"
                      />
                      {passwordError && (
                        <p className="text-[10px] text-red-500">
                          {passwordError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-[#353535] font-medium tracking-widest">
                      ********
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 w-full">
                {isEditingActual ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingActual(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setPasswordError("");
                      }}
                      className="px-10 py-2.5 bg-[#EAEAEA] text-[#020202] rounded-[10px] font-bold text-[15px] transition-all cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleProfileSave}
                      disabled={isLoading}
                      className="px-10 py-2.5 bg-[#DBE9FE] text-[#101827] rounded-[10px] font-bold text-[15px] transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? "Updating..." : "Update"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditMode(false);
                        setTimeout(() => setShowLogoutConfirm(true), 150);
                      }}
                      className="px-10 py-2 bg-[#FFD9D9] text-[#E00100] rounded-md font-medium text-[14px] transition-all cursor-pointer"
                    >
                      Logout
                    </button>
                    <button
                      onClick={() => setIsEditingActual(true)}
                      className="px-10 py-2 bg-[#DBE9FE] text-[#101827] rounded-md font-medium text-[14px] transition-all cursor-pointer"
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
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute left-4 top-4 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
              title="Close"
            >
              <img src={CloseIcon} alt="Close" className="w-5 h-5" />
            </button>

            {/* Heading */}
            <h3 className="text-[18px] font-gantari font-semibold text-[#020202] mt-[12px] mb-3">
              Log Out
            </h3>

            {/* Centered message */}
            <p className="text-center text-[14px] font-gantari font-semibold text-[#020202] mb-8 md:mb-10">
              Are you sure you want to log out?
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto mb-6">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#FFD9D9] text-[#E00100] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
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
