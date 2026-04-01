import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FiGrid, FiMenu, FiX } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";

// Get API base URL for image URLs
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || "";
};

import pmprofilebg from "../../assets/ProjectManager/consultant/pmprofilebg.jpg";
import mailIcon from "../../assets/ProjectManager/consultant/mailIcon.svg";
import messageIcon from "../../assets/ProjectManager/consultant/messageIcon.svg";
import callIcon from "../../assets/ProjectManager/consultant/callIcon.svg";
import eyeIcon from "../../assets/ProjectManager/consultant/eyeIcon.svg";
import editIcon from "../../assets/ProjectManager/consultant/editIcon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import projectViewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import projectEditIcon from "../../assets/ProjectManager/project/editIcon.svg";

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

  // If base URL is empty, use relative path (works if frontend and backend are on same domain)
  if (!base) {
    return urlPath;
  }

  return `${base}${urlPath}`;
};

const toCamelCase = (str: string): string => {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const SHOW_OPTIONS = ["1-50", "51-100", "101-150", "151-200", "201-250", "251-300", "All"];

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

// const PANEL_ROLES = [
//   "Management",
//   "Accounts",
//   "Project Manager",
//   "Technical Director",
//   "Client",
//   "Sales",
//   "Admin",
//   "BIM Lead",
//   "Employee",
//   "All",
// ];

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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
        className={`w-full flex items-center justify-between gap-2 transition-all outline-none font-gantari min-w-0 cursor-pointer ${
          styleType === "header"
            ? "px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold"
            : styleType === "table"
              ? `px-4 py-2 min-w-[140px] rounded-md border font-gantari font-medium text-[14px] ${value === "Active" ? "bg-[#E1F6EB] border-[#A7F3D0] text-[#008F22]" : "bg-[#FFE5E5] border-[#FECACA] text-[#E00100]"}`
              : `px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] border border-transparent focus:outline-none focus:border-[#AEACAC52] ${isOpen ? "!border-[#AEACAC52]" : ""}`
        }`}
      >
        <span
          className={`min-w-0 flex-1 truncate overflow-hidden text-left ${
            styleType === "header" || styleType === "form"
              ? isPlaceholder
                ? "text-[#8B8B8B]"
                : "text-[#353535]"
              : ""
          }`}
        >
          {styleType === "header" && value && !isPlaceholder ? (
            <>
              <span className="text-[14px]">{placeholder}:</span>{" "}
              <span className="font-semibold">{toCamelCase(value)}</span>
            </>
          ) : (
            value || placeholder
          )}
        </span>
        <img
          src={ArrowDown}
          alt=""
          className={`w-4 h-4 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""} ${styleType === "table" ? "opacity-70" : isPlaceholder ? "opacity-60 grayscale" : "opacity-90"}`}
          aria-hidden
        />
      </button>
      {isOpen && (
        <div
          className={`absolute top-full mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden ${
            alignMenu === "right" ? "right-0 left-auto" : "left-0"
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
                  className={`w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer hover:text-[#353535] hover:bg-[#F2F2F2] ${
                    isPlaceholder &&
                    placeholder !== "Show" &&
                    placeholder !== "Show entries"
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

export default function ConsultantBL() {
  const navigate = useNavigate();
  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.textContent = SCROLLBAR_STYLE;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  const { user } = useAuth();
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [_roles, setRoles] = useState<string[]>([]);
  const [_departments, setDepartments] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [inactiveIds, setInactiveIds] = useState<number[]>([]);
  const [inactiveSubmitting, setInactiveSubmitting] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedShow, setSelectedShow] = useState<string>("");
  const [statusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const canAdd = user?.panel_type === 1;

  useEffect(() => {
    api
      .get<{ employees?: Employee[] }>("/api/employees")
      .then(({ data }) => setList(data.employees ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  // Fetch roles and departments from backend (deduplicated, case-insensitive)
  useEffect(() => {
    api
      .get<{ roles?: string[] }>("/api/employees/roles")
      .then(({ data }) => {
        if (data.roles && Array.isArray(data.roles)) {
          const map = new Map<string, string>();
          data.roles.filter(Boolean).forEach((name) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            const key = trimmed.toLowerCase();
            if (!map.has(key)) {
              map.set(key, trimmed);
            }
          });
          setRoles(Array.from(map.values()));
        } else {
          setRoles([]);
        }
      })
      .catch((error) => {
        console.error("Error fetching roles:", error);
        setRoles([]);
      });

    api
      .get<{ departments?: string[] }>("/api/departments")
      .then(({ data }) => {
        if (data.departments && Array.isArray(data.departments)) {
          const map = new Map<string, string>();
          data.departments.filter(Boolean).forEach((name) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            const key = trimmed.toLowerCase();
            if (!map.has(key)) {
              map.set(key, trimmed);
            }
          });
          setDepartments(Array.from(map.values()));
        } else {
          setDepartments([]);
        }
      })
      .catch((error) => {
        console.error("Error fetching departments:", error);
        setDepartments([]);
      });
  }, []);

  const editParam = searchParams.get("edit");
  useEffect(() => {
    if (editParam && list.length) {
      const id = parseInt(editParam, 10);
      if (id && Number.isFinite(id) && list.some((e) => e.id === id)) {
        navigate(`/bl/consultants/${id}/edit`, { replace: true });
        setSearchParams({});
      }
    }
  }, [editParam, list, navigate, setSearchParams]);

  const filteredList = list.filter((emp) => {
    if (statusFilter === "Active") {
      const isActive = (emp.active || "").toLowerCase() === "active";
      if (!isActive) return false;
    } else if (statusFilter === "Deactivate") {
      const isActive = (emp.active || "").toLowerCase() === "active";
      if (isActive) return false;
    }

    if (typeFilter === "Employee") {
      const currentType = (emp.user_type || "").toLowerCase();
      if (currentType !== "employee") return false;
    } else if (typeFilter === "Trainee") {
      const currentType = (emp.user_type || "").toLowerCase();
      if (currentType !== "trainee") return false;
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

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const emails = inviteEmails
      .replace(/,/g, " ")
      .split(/\s+/)
      .filter((e) => e.trim());
    if (!emails.length) return;
    setInviteSubmitting(true);
    api
      .post("/api/employees/invite", { emails, message: inviteMessage })
      .then(() => {
        setShowInviteModal(false);
        setInviteEmails("");
        setInviteMessage("");
      })
      .catch(() => {})
      .finally(() => setInviteSubmitting(false));
  }

  function handleInactive() {
    if (!inactiveIds.length) return;
    setInactiveSubmitting(true);
    api
      .post("/api/employees/bulk-status", {
        ids: inactiveIds,
        action: "inactive",
      })
      .then(() => {
        setList((prev) =>
          prev.map((e) =>
            inactiveIds.includes(e.id) ? { ...e, active: "inactive" } : e,
          ),
        );
        setShowInactiveModal(false);
        setInactiveIds([]);
      })
      .catch(() => {})
      .finally(() => setInactiveSubmitting(false));
  }

  function handleStatusToggle(id: number, newStatus: string) {
    const status = newStatus.toLowerCase() === "active" ? "active" : "inactive";
    // Optimistic UI update
    setList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, active: status } : e)),
    );
    api
      .post("/api/employees/bulk-status", { ids: [id], action: status })
      .catch((err) => {
        console.error("Failed to update status:", err);
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
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="sticky z-50 bg-white mb-4 mt-2 overflow-visible">
        <div className="flex w-full min-h-[44px] flex-nowrap items-center gap-2 sm:gap-3 overflow-visible">
          <h1 className="text-[24px] font-medium text-[#000000] font-Gantari shrink-0 pr-1">
            Consultant
          </h1>
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-visible">
            <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2 overflow-x-auto overflow-y-visible py-1 pr-0.5 custom-scrollbar">
              {canAdd && (
                <>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    aria-label="Table view"
                    className={`shrink-0 p-2 rounded-full transition-all cursor-pointer ${viewMode === "table" ? "bg-[#DD4342] text-[#F2F2F2]" : "bg-[#E0E0E0] text-[#000000]"}`}
                  >
                    <FiMenu className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("card")}
                    aria-label="Card view"
                    className={`shrink-0 p-2 rounded-full transition-all cursor-pointer ${viewMode === "card" ? "bg-[#DD4342] text-[#F2F2F2]" : "bg-[#E0E0E0] text-[#000000]"}`}
                  >
                    <FiGrid className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/bl/consultants/add")}
                    className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-[15px] font-Gantari font-semibold whitespace-nowrap cursor-pointer"
                  >
                    Add Consultant
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-[15px] font-Gantari font-semibold whitespace-nowrap cursor-pointer"
                  >
                    Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInactiveModal(true)}
                    className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-[16px] font-Gantari font-semibold whitespace-nowrap cursor-pointer"
                  >
                    Manage Deactive
                  </button>
                </>
              )}
            </div>
            <div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2 overflow-visible">
              {viewMode === "table" && (
                <CustomDropdown
                  options={SHOW_OPTIONS}
                  value={selectedShow}
                  onChange={(val) => setSelectedShow(val)}
                  placeholder="Show entries"
                  className="w-[140px]"
                  styleType="header"
                  alignMenu="right"
                  menuMaxHeightClass="max-h-[168px]"
                />
              )}
              <CustomDropdown
                options={["All", "Employee", "Trainee"]}
                value={typeFilter}
                onChange={(val) => setTypeFilter(val)}
                placeholder="Type"
                className="w-[120px]"
                styleType="header"
                alignMenu="right"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-2">
            {displayedList.length === 0 ? (
              <div className="col-span-full bg-white rounded-md border border-slate-200 p-8 sm:p-12 text-center text-slate-500 shadow-sm">
                No consultants found.
              </div>
            ) : (
              displayedList.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white rounded-[10px] overflow-hidden border border-slate-200 transition-all"
                >
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
                      <div
                        className={`flex items-center gap-1.5 px-2 rounded-full border shadow-sm ${emp.active === "active" ? "bg-[#E0FFE8] border-emerald-100" : "bg-[#FFEEEE] border-red-100"}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${emp.active === "active" ? "bg-[#166534]" : "bg-[#E00100]"}`}
                        ></span>
                        <span
                          className={`text-[14px] font-semibold ${emp.active === "active" ? "text-[#008F22]" : "text-[#E00100]"}`}
                        >
                          {emp.active === "active" ? "Active" : "Deactivate"}
                        </span>
                      </div>
                    </div>

                    {/* User Profile Info on Image */}
                    <div className="absolute inset-x-0 bottom-0 px-3 py-3 sm:px-3 sm:py-4 flex items-center gap-4 z-10">
                      <div className="w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-white overflow-hidden shrink-0 border-2 border-white shadow-sm">
                        {emp.profile_picture && emp.profile_picture.trim() ? (
                          <img
                            src={getProfileUrl(emp.profile_picture)}
                            alt={emp.full_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const parent = target.parentElement;
                              if (
                                parent &&
                                !parent.querySelector(".error-placeholder")
                              ) {
                                parent.innerHTML =
                                  '<div class="w-full h-full bg-gray-200 flex items-center justify-center error-placeholder"><span class="text-gray-400 text-xs">No Photo</span></div>';
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">
                              No Photo
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[18px] sm:text-[20px] font-Gantari font-medium text-[#F2F2F2] leading-tight tracking-tight truncate">
                          {toCamelCase(emp.full_name)}
                        </h3>
                        <p className="text-[14px] sm:text-[16px] text-[#F2F2F2] mt-1">
                          {emp.user_role || "Consultant"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="px-2.5 py-4 sm:px-3 sm:py-5 space-y-4 sm:space-y-5">
                    {/* Contact Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://mail.google.com/mail/?view=cm&fs=1&to=${emp.email}`,
                            "_blank",
                          )
                        }
                        className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-md text-[#12141D] text-[12px] sm:text-[14px] font-medium font-Gantari cursor-pointer"
                      >
                        <img src={mailIcon} alt="Mail" className="w-4 h-4" />{" "}
                        Mail
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/chat")}
                        className="flex-[1.4] min-w-[90px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-md text-[#12141D] text-[12px] sm:text-[14px] font-medium font-Gantari cursor-pointer"
                      >
                        <img
                          src={messageIcon}
                          alt="Message"
                          className="w-4 h-4"
                        />{" "}
                        Message
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = `tel:${emp.phone_number || ""}`)
                        }
                        className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-md text-[#12141D] text-[12px] sm:text-[14px] font-medium font-Gantari cursor-pointer"
                      >
                        <img src={callIcon} alt="Call" className="w-4 h-4" />{" "}
                        Call
                      </button>
                    </div>

                    <hr className="border-slate-200" />

                    {/* Actions Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setShowDetailsModal(true);
                        }}
                        aria-label="View consultant"
                        className="flex items-center justify-center gap-2 py-2 bg-[#DD4342] text-white rounded-md text-[12px] sm:text-[14px] font-medium font-gantari cursor-pointer"
                      >
                        <img
                          src={eyeIcon}
                          alt=""
                          className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                          aria-hidden
                        />
                        View
                      </button>
                      {canAdd && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/bl/consultants/${emp.id}/edit`)
                          }
                          aria-label="Edit consultant"
                          className="flex items-center justify-center gap-2 py-2 bg-[#F2F2F2] text-[#353535] rounded-md text-[12px] sm:text-[14px] font-medium font-gantari cursor-pointer"
                        >
                          <img
                            src={editIcon}
                            alt=""
                            className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                            aria-hidden
                          />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="px-2 sm:px-0">
            <div className="bg-white rounded-md border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col relative w-full mb-8">
              <div className="overflow-x-auto overflow-y-visible custom-scrollbar smooth-scroll flex-1 min-h-[280px]">
                <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 z-20 bg-white after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                    <tr className="bg-white">
                      <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">
                        Sl.No
                      </th>
                      <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">
                        Emp ID
                      </th>
                      <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">
                        Consultant Name
                      </th>
                      <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">
                        Email ID
                      </th>
                      <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">
                        Contact Info
                      </th>
                      <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayedList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-20 text-center text-[14px] text-[#616161] font-normal font-Gantari bg-white"
                        >
                          No records found
                        </td>
                      </tr>
                    ) : (
                      displayedList.map((emp, idx) => {
                        const slNo = (limitStart + idx + 1)
                          .toString()
                          .padStart(2, "0");
                        return (
                          <tr
                            key={emp.id}
                            className={
                              idx % 2 === 1
                                ? "bg-[#F2F2F2]"
                                : "bg-white hover:bg-slate-50 transition-colors"
                            }
                          >
                            <td className="px-3 py-5 text-center text-[14px] font-normal font-Gantari text-[#353535] border-b border-[#F0F0F0] whitespace-nowrap">
                              {slNo}
                            </td>
                            <td className="px-3 py-5 text-center text-[14px] font-normal font-Gantari text-[#353535] border-b border-[#F0F0F0] whitespace-nowrap">
                              {emp.empid ||
                                `EMP-${(emp.id + 150).toString().padStart(4, "0")}`}
                            </td>
                            <td className="px-6 py-5 border-b border-[#F0F0F0] whitespace-nowrap">
                              <div className="flex items-center justify-center gap-4">
                                <div className="relative shrink-0">
                                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-200">
                                    {emp.profile_picture &&
                                    emp.profile_picture.trim() ? (
                                      <img
                                        src={getProfileUrl(emp.profile_picture)}
                                        alt={emp.full_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          const parent = target.parentElement;
                                          if (
                                            parent &&
                                            !parent.querySelector(
                                              ".error-placeholder",
                                            )
                                          ) {
                                            parent.innerHTML =
                                              '<div class="w-full h-full bg-gray-200 flex items-center justify-center error-placeholder"><span class="text-gray-400 text-[10px]">No Photo</span></div>';
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                        <span className="text-gray-400 text-[10px]">
                                          No Photo
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <span
                                    className={`absolute top-0 left-0 w-3 h-3 border-2 border-white rounded-full ${emp.active === "active" ? "bg-[#22c55e]" : "bg-[#ef4444]"}`}
                                  />
                                </div>
                                <span className="text-[14px] font-normal font-Gantari text-[#353535]">
                                  {toCamelCase(emp.full_name || "-")}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center text-[14px] font-normal font-Gantari text-[#353535] border-b border-[#F0F0F0] whitespace-nowrap">
                              {emp.email || "-"}
                            </td>
                            <td className="px-6 py-5 text-center border-b border-[#F0F0F0] whitespace-nowrap">
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      `https://mail.google.com/mail/?view=cm&fs=1&to=${emp.email}`,
                                      "_blank",
                                    )
                                  }
                                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] transition-colors hover:bg-[#D1E6FF] cursor-pointer"
                                >
                                  <img
                                    src={mailIcon}
                                    className="w-5 h-5"
                                    alt="Mail"
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate("/chat")}
                                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] transition-colors hover:bg-[#D1E6FF] cursor-pointer"
                                >
                                  <img
                                    src={messageIcon}
                                    className="w-5 h-5"
                                    alt="Message"
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    (window.location.href = `tel:${emp.phone_number || ""}`)
                                  }
                                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] transition-colors hover:bg-[#D1E6FF] cursor-pointer"
                                >
                                  <img
                                    src={callIcon}
                                    className="w-5 h-5"
                                    alt="Call"
                                  />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center border-b border-[#AEACAC52] whitespace-nowrap">
                              <div className="flex items-center justify-center">
                                <CustomDropdown
                                  options={["Active", "Deactivate"]}
                                  value={
                                    emp.active === "active"
                                      ? "Active"
                                      : "Deactivate"
                                  }
                                  onChange={(val) =>
                                    handleStatusToggle(emp.id, val)
                                  }
                                  placeholder="Status"
                                  className="w-[140px]"
                                  styleType="table"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center border-b border-[#F0F0F0] whitespace-nowrap">
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEmployee(emp);
                                    setShowDetailsModal(true);
                                  }}
                                  aria-label="View consultant"
                                  className="flex py-2 px-2 shrink-0 items-center justify-center bg-[#DD4342] text-white rounded-md transition-all cursor-pointer"
                                >
                                  <img
                                    src={projectViewIcon}
                                    className="w-4 h-4 brightness-0 invert"
                                    alt=""
                                    aria-hidden
                                  />
                                </button>
                                {canAdd && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(`/bl/consultants/${emp.id}/edit`)
                                    }
                                    aria-label="Edit consultant"
                                    className={`flex py-2 px-2 shrink-0 items-center justify-center rounded-md transition-all cursor-pointer ${idx % 2 === 1 ? "bg-[#FFFFFF]" : "bg-[#F2F2F2]"}`}
                                  >
                                    <img
                                      src={projectEditIcon}
                                      className="w-4 h-4"
                                      alt=""
                                      aria-hidden
                                    />
                                  </button>
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
        )}
      </div>

      {showInviteModal &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]">
            <div className="bg-white rounded-[20px] max-w-[813px] w-full max-h-[90vh] overflow-hidden p-8 sm:p-10 relative shadow-2xl flex flex-col font-Gantari">
              <div className="flex items-center justify-center mb-8 relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmails("");
                    setInviteMessage("");
                  }}
                  className="absolute left-0 p-2.5 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
                >
                  <FiX className="w-5 h-5 font-bold" />
                </button>
                <h3 className="text-[24px] font-semibold text-[#020202] text-center">
                  Invite New Consultant
                </h3>
              </div>

              <form
                onSubmit={handleInvite}
                className="space-y-8 overflow-y-auto custom-scrollbar pr-2"
              >
                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-3">
                    Email Addresses
                  </label>
                  <textarea
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52] leading-relaxed"
                    placeholder="Enter Multiple Email addresses separated by commas,"
                  />
                  <p className="text-[14px] text-[#666666] mt-3 font-medium">
                    Separate multiple emails with commas (eg., email01@eg.com)
                  </p>
                </div>

                <div>
                  <label className="block text-[16px] font-semibold text-[#000000] mb-3">
                    Invitation Message
                  </label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52] leading-relaxed"
                    placeholder="Enter your Invitation Message.,"
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="px-12 py-3 rounded-[5px] bg-[#D1E6FF] text-[#1A1A1A] font-bold text-[16px] disabled:opacity-50 transition-all min-w-[200px] cursor-pointer disabled:cursor-not-allowed"
                  >
                    {inviteSubmitting ? "Sending..." : "Send Invitations"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {showInactiveModal &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]">
            <div className="bg-white rounded-[20px] max-w-[950px] w-full max-h-[90vh] overflow-hidden p-8 sm:p-10 relative shadow-2xl flex flex-col font-Gantari">
              <div className="flex items-center justify-center mb-8 relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowInactiveModal(false);
                    setInactiveIds([]);
                  }}
                  className="absolute left-0 p-2.5 rounded-[5px] bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
                >
                  <FiX className="w-5 h-5 font-bold" />
                </button>
                <h3 className="text-[24px] font-semibold text-[#020202] text-center">
                  Manage In-active Consultants
                </h3>
              </div>

              <div className="shrink-0 mb-8 px-4">
                <p className="text-[15px] text-[#353535] mb-2 leading-relaxed font-medium">
                  Select Consultants to mark as IN-Active. In-Active Consultants
                  will not appear in Project Assignment dropdowns.
                </p>
                <p className="text-[16px] font-semibold text-[#3d3399]">
                  {inactiveIds.length} Consultant(s) will be marked as In-Active
                </p>
              </div>

              <div className="flex-1 overflow-y-auto border border-[#E0E0E0] rounded-[15px] custom-scrollbar mb-10">
                {(() => {
                  const grouped = list.reduce(
                    (acc: Record<string, Employee[]>, emp) => {
                      const role = emp.user_role || "General";
                      if (!acc[role]) acc[role] = [];
                      acc[role].push(emp);
                      return acc;
                    },
                    {},
                  );

                  return Object.entries(grouped).map(([role, emps]) => (
                    <div
                      key={role}
                      className="border-b border-[#E0E0E0] last:border-none"
                    >
                      <div className="px-6 py-4 bg-white font-semibold text-[16px] text-[#000000] border-b border-[#F0F0F0]">
                        {role}
                      </div>
                      <div className="divide-y divide-[#F0F0F0]">
                        {emps.map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center justify-between px-6 py-4 transition-colors"
                          >
                            <div className="flex items-center gap-6">
                              <div
                                onClick={() =>
                                  setInactiveIds((prev) =>
                                    prev.includes(emp.id)
                                      ? prev.filter((id) => id !== emp.id)
                                      : [...prev, emp.id],
                                  )
                                }
                                className={`w-7 h-7 rounded-[5px] border-2 cursor-pointer flex items-center justify-center transition-all ${inactiveIds.includes(emp.id) ? "bg-[#D1E6FF] border-[#D1E6FF]" : "bg-white border-[#E0E0E0]"}`}
                              >
                                {inactiveIds.includes(emp.id) && (
                                  <svg
                                    width="16"
                                    height="12"
                                    viewBox="0 0 14 11"
                                    fill="none"
                                  >
                                    <path
                                      d="M1 5L5 9L13 1"
                                      stroke="#1A1A1A"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                              <span className="text-[16px] font-semibold text-[#6B6B6B]">
                                {toCamelCase(emp.full_name)}{" "}
                                {emp.empid
                                  ? `(${emp.empid})`
                                  : `(EMP-${(emp.id + 150).toString().padStart(4, "0")})`}
                              </span>
                            </div>
                            {(emp.active === "inactive" ||
                              emp.active === "deactive") && (
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
                  onClick={() => {
                    setShowInactiveModal(false);
                    setInactiveIds([]);
                  }}
                  className="px-12 py-3 rounded-[5px] bg-[#F4F4F4] text-[#353535] font-semibold text-[16px] transition-all min-w-[150px] cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleInactive}
                  disabled={!inactiveIds.length || inactiveSubmitting}
                  className="px-12 py-3 rounded-[5px] bg-[#D1E6FF] text-[#1A1A1A] font-semibold text-[16px] disabled:opacity-50 transition-all min-w-[180px] cursor-pointer disabled:cursor-not-allowed"
                >
                  {inactiveSubmitting ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {showDetailsModal && selectedEmployee && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]">
          <div className="bg-white rounded-lg max-w-[520px] w-full overflow-hidden px-[20px] py-[20px] relative shadow-2xl flex flex-col gap-6 font-Gantari">
            {/* Header */}
            <div className="flex items-center justify-center relative shrink-0">
              <button
                type="button"
                onClick={() => { setShowDetailsModal(false); setSelectedEmployee(null); }}
                className="absolute left-0 p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
              >
                <FiX className="w-5 h-5 font-bold" />
              </button>
              <h3 className="text-[24px] font-semibold text-[#000000] font-Gantari">View Details</h3>
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
                { label: 'Department', value: selectedEmployee.department },
                { label: 'Salary', value: selectedEmployee.salary },
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
        document.body,
      )}
    </div>
  );
}
