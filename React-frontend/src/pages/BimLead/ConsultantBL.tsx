import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FiPlus, FiGrid, FiMenu, FiChevronDown, FiX } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";

// Get API base URL for image URLs
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || "";
};

import pmprofilebg from "../../assets/ProjectManager/consultant/pmprofilebg.jpg";
import exportIcon from "../../assets/ProjectManager/consultant/exportIcon.svg";
import mailIcon from "../../assets/ProjectManager/consultant/mailIcon.svg";
import messageIcon from "../../assets/ProjectManager/consultant/messageIcon.svg";
import callIcon from "../../assets/ProjectManager/consultant/callIcon.svg";
import eyeIcon from "../../assets/ProjectManager/consultant/eyeIcon.svg";
import editIcon from "../../assets/ProjectManager/consultant/editIcon.svg";

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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between transition-all outline-none font-Gantari cursor-pointer ${
          styleType === "header"
            ? "px-3 py-1.5 bg-[#E8E8E8] rounded-[10px] text-[#353535] text-[14px] font-semibold"
            : styleType === "table"
              ? `px-4 py-2.5 min-w-[140px] rounded-[5px] border font-bold text-[14px] ${value === "Active" ? "bg-[#E0FFE8] border-[#A7F3D0] text-[#008F22]" : "bg-[#FFEEEE] border-[#FECACA] text-[#E00100]"}`
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
        <FiChevronDown
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${styleType === "table" ? "opacity-70" : "text-slate-500"}`}
        />
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
                className="w-full text-left px-4 py-2.5 text-[14px] text-[#8B8B8B] font-Gantari hover:text-[#353535] hover:bg-[#F2F2F2] transition-colors cursor-pointer"
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, _setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

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
    if (statusFilter !== "All") {
      const isActive = (emp.active || "").toLowerCase() === "active";
      if (statusFilter === "Active" && !isActive) return false;
      if (
        (statusFilter === "Deactive" ||
          statusFilter === "deactive" ||
          statusFilter === "Deactivate") &&
        isActive
      )
        return false;
    }

    if (typeFilter !== "All") {
      const currentType = (emp.user_type || "").toLowerCase();
      if (typeFilter === "Employee" && currentType !== "employee") return false;
      if (typeFilter === "Trainee" && currentType !== "trainee")
        return false;
    }

    return true;
  });

  const effectivePerPage =
    itemsPerPage === 0 ? filteredList.length || 1 : itemsPerPage;
  const paginatedList = filteredList.slice(
    (currentPage - 1) * effectivePerPage,
    currentPage * effectivePerPage,
  );
  const totalPages = Math.ceil(filteredList.length / effectivePerPage);

  function exportCsv() {
    const headers = ["Name", "Email", "Role", "Status", "Phone", "Department"];
    const rows = list.map((e) =>
      [
        e.full_name,
        e.email,
        e.user_role || "",
        e.active || "",
        e.phone_number || "",
        e.department || "",
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "consultants.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

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
      <div className="sticky z-50 bg-white mb-4 mt-2">
        {/* ROW 1 */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <h2 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari truncate">
            Consultant
          </h2>
          {canAdd && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => navigate("/bl/consultants/add")}
                className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap shadow-sm shadow-red-100 cursor-pointer"
              >
                <FiPlus className="w-[18px] h-[18px] sm:w-[24px] sm:h-[24px]" />
                Add Consultant
              </button>
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap shadow-sm shadow-red-100 cursor-pointer"
              >
                <FiPlus className="w-[18px] h-[18px] sm:w-[24px] sm:h-[24px]" />
                Invite
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap shadow-sm shadow-red-100 cursor-pointer"
              >
                <img
                  src={exportIcon}
                  alt="Export"
                  className="w-[18px] h-[18px] sm:w-[24px] sm:h-[24px]"
                />
                CSV
              </button>
              <button
                type="button"
                onClick={() => setShowInactiveModal(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-base whitespace-nowrap shadow-sm shadow-red-100 cursor-pointer"
              >
                Manage Inactive
              </button>
            </div>
          )}
        </div>
        {/* ROW 2 */}
        <div className="flex flex-col sm:flex-row justify-between sm:justify-end items-start sm:items-center gap-4 mt-6 sm:mt-8 mb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-full transition-all cursor-pointer ${viewMode === "table" ? "bg-[#DD4342] text-[#F2F2F2]" : "bg-[#E0E0E0] text-[#000000]"}`}
            >
              <FiMenu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`p-2 rounded-full transition-all cursor-pointer ${viewMode === "card" ? "bg-[#DD4342] text-[#F2F2F2]" : "bg-[#E0E0E0] text-[#000000]"}`}
            >
              <FiGrid className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <CustomDropdown
              options={["All", "Employee", "Trainee"]}
              value={typeFilter === "All" ? "Type" : typeFilter}
              onChange={(val) => setTypeFilter(val)}
              placeholder="Type"
              className="flex-1 sm:min-w-[120px]"
              styleType="header"
            />
            <CustomDropdown
              options={
                viewMode === "card"
                  ? ["All", "Active", "Deactivate"]
                  : ["All", "Active", "deactive"]
              }
              value={statusFilter === "All" ? "Status" : statusFilter}
              onChange={(val) => {
                let nextStatus = val;
                if (viewMode === "card") {
                  if (val === "Deactivate") nextStatus = "Deactive";
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
        {viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 p-4 sm:p-6">
            {filteredList.length === 0 ? (
              <div className="col-span-full bg-white rounded-[10px] border border-slate-200 p-8 sm:p-12 text-center text-slate-500 shadow-sm">
                No consultants found.
              </div>
            ) : (
              paginatedList.map((emp) => (
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
                          className={`text-[11px] font-semibold ${emp.active === "active" ? "text-[#008F22]" : "text-[#E00100]"}`}
                        >
                          {emp.active === "active" ? "Active" : "Deactivate"}
                        </span>
                      </div>
                    </div>

                    {/* User Profile Info on Image */}
                    <div className="absolute inset-x-0 bottom-0 p-4 flex items-center gap-4 z-10">
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
                        <h3 className="text-[18px] sm:text-[22px] font-Gantari font-semibold text-[#F2F2F2] leading-tight tracking-tight truncate">
                          {toCamelCase(emp.full_name)}
                        </h3>
                        <p className="text-[14px] sm:text-[16px] text-[#F2F2F2] mt-1 truncate">
                          {emp.user_role || "Consultant"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-4 space-y-4 sm:space-y-5">
                    {/* Contact Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://mail.google.com/mail/?view=cm&fs=1&to=${emp.email}`,
                            "_blank",
                          )
                        }
                        className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-lg text-[#12141D] text-[12px] sm:text-[14px] font-semibold font-Gantari cursor-pointer"
                      >
                        <img src={mailIcon} alt="Mail" className="w-4 h-4" />{" "}
                        Mail
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/chat")}
                        className="flex-[1.4] min-w-[90px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-[5px] text-[#12141D] text-[12px] sm:text-[13px] font-semibold font-Gantari cursor-pointer"
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
                        className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-lg text-[#12141D] text-[12px] sm:text-[13px] font-semibold font-Gantari cursor-pointer"
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
                        className="flex items-center justify-center gap-2 py-2 bg-[#DD4342] text-white rounded-lg text-[12px] sm:text-[14px] font-Gantari cursor-pointer"
                      >
                        <img
                          src={eyeIcon}
                          alt="View"
                          className="w-4 h-4 sm:w-5 sm:h-5"
                        />{" "}
                        View
                      </button>
                      {canAdd && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/bl/consultants/${emp.id}/edit`)
                          }
                          className="flex items-center justify-center gap-2 py-2 bg-[#F2F2F2] text-[#353535] rounded-lg text-[12px] sm:text-[14px] font-Gantari cursor-pointer"
                        >
                          <img
                            src={editIcon}
                            alt="Edit"
                            className="w-4 h-4 sm:w-5 sm:h-5"
                          />{" "}
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
          <div className="sticky top-0 z-40 border border-[#F0F0F0] rounded-[15px] overflow-hidden bg-white">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-40">
                  <tr className="bg-white">
                    <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">
                      Sl.No
                    </th>
                    <th className="px-4 py-4 text-left text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">
                      Emp ID
                    </th>
                    <th className="px-4 py-4 text-left text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">
                      Consultant Name
                    </th>
                    <th className="px-4 py-4 text-left text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">
                      Email ID
                    </th>
                    <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">
                      Contact Info
                    </th>
                    <th className="px-4 py-4 text-center text-[16px] font-semibold font-Gantari text-[#353535] border-b border-[#F0F0F0] bg-white">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-500 font-Gantari"
                      >
                        No consultants found.
                      </td>
                    </tr>
                  ) : (
                    paginatedList.map((emp, idx) => (
                      <tr
                        key={emp.id}
                        className={idx % 2 === 1 ? "bg-[#F2F2F2]" : "bg-white"}
                      >
                        <td className="px-6 py-5 text-center text-[15px] font-semibold font-Gantari text-[#6B6B6B]">
                          {String(
                            (currentPage - 1) * effectivePerPage + idx + 1,
                          ).padStart(2, "0")}
                        </td>
                        <td className="px-6 py-5 text-left text-[15px] font-semibold font-Gantari text-[#6B6B6B]">
                          {emp.empid || `EMP0${emp.id + 10}`}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
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
                              ></span>
                            </div>
                            <span className="text-[16px] font-semibold font-Gantari text-[#353535]">
                              {toCamelCase(emp.full_name)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-left text-[15px] font-medium font-Gantari text-[#353535]">
                          {emp.email}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() =>
                                window.open(
                                  `https://mail.google.com/mail/?view=cm&fs=1&to=${emp.email}`,
                                  "_blank",
                                )
                              }
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] hover:bg-[#d0e2ff] transition-colors cursor-pointer"
                            >
                              <img
                                src={mailIcon}
                                className="w-5 h-5"
                                alt="Mail"
                              />
                            </button>
                            <button
                              onClick={() => navigate("/chat")}
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] hover:bg-[#d0e2ff] transition-colors cursor-pointer"
                            >
                              <img
                                src={messageIcon}
                                className="w-5 h-5"
                                alt="Message"
                              />
                            </button>
                            <button
                              onClick={() =>
                                (window.location.href = `tel:${emp.phone_number || ""}`)
                              }
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E8F1FF] hover:bg-[#d0e2ff] transition-colors cursor-pointer"
                            >
                              <img
                                src={callIcon}
                                className="w-5 h-5"
                                alt="Call"
                              />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="inline-block min-w-[140px]">
                            <CustomDropdown
                              value={
                                emp.active === "active"
                                  ? "Active"
                                  : "Deactivate"
                              }
                              onChange={(val) =>
                                handleStatusToggle(emp.id, val)
                              }
                              options={["Active", "Deactivate"]}
                              placeholder="Status"
                              styleType="table"
                            />
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
      {viewMode === "table" && (
        <div className="sticky bottom-0 z-50 bg-white py-4 mt-auto">
          <div className="flex justify-end pr-2">
            <div className="flex items-center bg-[#F2F2F2] rounded-[10px] overflow-hidden border border-slate-200 ">
              <div className="px-5 py-2.5 text-[14px] font-semibold text-[#6B6B6B] border-r border-slate-200">
                Showing:
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-5 py-2.5 flex items-center gap-2 text-[14px] font-semibold text-[#6B6B6B] hover:bg-slate-100 transition-colors border-r border-slate-200 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
                    className={`px-5 py-2.5 text-[14px] font-bold border-r border-slate-200 transition-colors cursor-pointer ${currentPage === page ? "text-white bg-[#DD4342]" : "text-[#6B6B6B] hover:bg-slate-100"}`}
                  >
                    {(page - 1) * 10 + 1}-{Math.min(page * 10, list.length)}
                  </button>
                ));
              })()}

              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-5 py-2.5 flex items-center gap-2 text-[14px] font-semibold text-[#6B6B6B] hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
                <FiChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}

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
