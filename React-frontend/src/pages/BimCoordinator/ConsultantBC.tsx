import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiGrid, FiMenu, FiChevronDown, FiX } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";

// Get API base URL for image URLs (same logic as other panels)
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

const SHOW_ENTRIES_PLACEHOLDER = "Show Entries";
const SHOW_ENTRIES_SELECTED_PREFIX = "Show:";
const showEntriesOptions: {
  value: string;
  label: string;
  start: number;
  end: number | null;
}[] = [
    { value: "1-50", label: "1-50", start: 0, end: 50 },
    { value: "51-100", label: "51-100", start: 50, end: 100 },
    { value: "101-150", label: "101-150", start: 100, end: 150 },
    { value: "151-200", label: "151-200", start: 150, end: 200 },
    { value: "201-250", label: "201-250", start: 200, end: 250 },
    { value: "251-300", label: "251-300", start: 250, end: 300 },
    { value: "all", label: "All", start: 0, end: null },
  ];

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
      index === 0 ? part : encodeURIComponent(part),
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
      index === 0 ? part : encodeURIComponent(part),
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

const isEmployeeActive = (emp: Employee) => {
  return emp.active === "active" || emp.active === "Active";
};

const getAllowedRoles = () => [
  "Consultant",
  "BIM Coordinator",
  "BIM Lead",
  "Project Manager",
  "BIM Modeler",
  "BIM Architect",
  "BIM Architect Lead",
  "Tekla Modeler",
  "BIM Project Manager",
  "Business Development Manager",
  "Vice President Projects",
  "Junior BIM Modeler",
  "Architect Intern",
  "BIM Modeler- MEP",
  "HR Executive",
  "Graphic Designer",
  "Management",
];

const toCamelCase = (str: string) => {
  if (!str) return str;
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

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
        className={`w-full flex items-center justify-between gap-2 transition-all outline-none font-gantari min-w-0 cursor-pointer ${styleType === "header"
            ? "px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold"
            : styleType === "table"
              ? `px-4 py-2 min-w-[140px] rounded-md border font-gantari font-medium text-[14px] ${value === "Active" ? "bg-[#E1F6EB] border-[#A7F3D0] text-[#008F22]" : "bg-[#FFE5E5] border-[#FECACA] text-[#E00100]"}`
              : `px-4 py-2 bg-[#F2F3F4] rounded-md text-[14px] border border-transparent focus:outline-none focus:border-[#AEACAC52] ${isOpen ? "!border-[#AEACAC52]" : ""}`
          }`}
      >
        <span
          className={`min-w-0 flex-1 truncate overflow-hidden text-left ${styleType === "header" || styleType === "form"
              ? isPlaceholder
                ? "text-[#8B8B8B]"
                : "text-[#353535]"
              : ""
            }`}
        >
          {styleType === "header" && value && !isPlaceholder ? (
            <span className="font-semibold">{toCamelCase(value)}</span>
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
          className={`absolute top-full mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden ${alignMenu === "right" ? "right-0 left-auto" : "left-0"
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
                  className={`w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer hover:text-[#353535] hover:bg-[#F2F2F2] ${isPlaceholder &&
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

export default function ConsultantBC() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "card">("card");

  // Missing States
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<any>({
    full_name: "",
    email: "",
    password: "",
    phone_number: "",
    user_role: "Consultant",
    department: "",
    address: "",
    dob: "",
    type: "",
    joining_date: "",
    profile_picture: null,
    active: "Active",
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);

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
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);
  const todayISO = new Date().toISOString().split("T")[0];

  const COUNTRY_CODES = [
    "+91",
    "+1",
    "+44",
    "+61",
    "+81",
    "+971",
    "+33",
    "+49",
    "+82",
    "+86",
  ];
  const [countryCode, setCountryCode] = useState("+91");

  const canAdd = user?.panel_type === 1;

  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.textContent = SCROLLBAR_STYLE;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  useEffect(() => {
    api
      .get<{ employees?: Employee[] }>("/api/employees")
      .then(({ data }) => setList(data.employees ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Fetch departments
    api
      .get<{ departments?: string[] }>("/api/departments")
      .then(({ data }) => setDepartments(data.departments || []))
      .catch((error) => {
        console.error("Error fetching departments:", error);
        setDepartments([]);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (
        showEntriesOpen &&
        showEntriesDropdownRef.current &&
        !showEntriesDropdownRef.current.contains(t)
      ) {
        setShowEntriesOpen(false);
      }
    };
    if (showEntriesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEntriesOpen]);

  useEffect(() => {
    if (showEntriesOpen && showEntriesDropdownContentRef.current) {
      showEntriesDropdownContentRef.current.scrollTop = 0;
    }
  }, [showEntriesOpen]);

  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const filteredList = list.filter((emp) => {
    const matchesSearch =
      !searchQuery ||
      (emp.full_name || "").toLowerCase().includes(searchQuery) ||
      (emp.email || "").toLowerCase().includes(searchQuery) ||
      (emp.user_role || "").toLowerCase().includes(searchQuery) ||
      (emp.department || "").toLowerCase().includes(searchQuery) ||
      (emp.phone_number || "").toLowerCase().includes(searchQuery);
    if (!matchesSearch) return false;

    if (typeFilter === "Employee") {
      const currentType = (emp.user_type || "").toLowerCase();
      if (currentType !== "employee") return false;
    } else if (typeFilter === "Trainee") {
      const currentType = (emp.user_type || "").toLowerCase();
      if (currentType !== "trainee") return false;
    }

    if (statusFilter === "Active") {
      if (emp.active !== "active") return false;
    } else if (statusFilter === "Deactivate") {
      if (emp.active !== "deactive" && emp.active !== "inactive") return false;
    }
    return true;
  });

  const effectiveShowEntryValue =
    selectedShowEntries || showEntriesOptions[0].value;
  const selectedRange =
    showEntriesOptions.find((o) => o.value === effectiveShowEntryValue) ??
    showEntriesOptions[0];
  const rangeStart = selectedRange.start;
  const rangeEnd =
    selectedRange.end === null
      ? filteredList.length
      : Math.min(selectedRange.end, filteredList.length);
  const displayedList = filteredList.slice(rangeStart, rangeEnd);

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
      .catch(() => { })
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
      .catch(() => { })
      .finally(() => setInactiveSubmitting(false));
  }

  function handleStatusChange(id: number, nextStatus: "active" | "inactive") {
    api
      .post("/api/employees/bulk-status", {
        ids: [id],
        action: nextStatus,
      })
      .then(() => {
        setList((prev) =>
          prev.map((e) => (e.id === id ? { ...e, active: nextStatus } : e)),
        );
      })
      .catch((err) => {
        console.error("Failed to update status:", err);
      });
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setAddError("Name, email and password are required.");
      return;
    }

    const cleanPhone = (form.phone_number || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 12) {
      setAddError("Phone number must be exactly 12 digits.");
      return;
    }

    if (form.dob) {
      const today = new Date();
      const dobDate = new Date(form.dob);
      today.setHours(0, 0, 0, 0);
      dobDate.setHours(0, 0, 0, 0);
      if (dobDate > today) {
        setAddError("Date of birth cannot be in the future.");
        return;
      }
    }
    setAddSubmitting(true);

    // Use multipart/form-data so backend receives profile_picture file
    const formData = new FormData();
    const addedEmail = form.email.trim();
    const fullPhone = `${countryCode}${cleanPhone}`;
    formData.append("full_name", form.full_name.trim());
    formData.append("email", addedEmail);
    formData.append("password", form.password);
    formData.append("phone_number", fullPhone);
    if (form.user_role) formData.append("user_role", form.user_role);
    if (form.address.trim()) formData.append("address", form.address.trim());
    if (form.dob) formData.append("dob", form.dob);
    if (form.type) formData.append("user_type", form.type);
    if (form.joining_date) formData.append("doj", form.joining_date);
    if (form.department) formData.append("department", form.department);
    if (form.active)
      formData.append(
        "active",
        form.active === "Active" ? "active" : "inactive",
      );
    if (form.profile_picture) {
      formData.append("profile_picture", form.profile_picture);
    }

    api
      .post<{
        success: boolean;
        id?: number;
        message?: string;
        profile_picture?: string | null;
      }>("/api/employees", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(({ data }) => {
        if (data.success) {
          // Send welcome mail to the newly created consultant.
          // Backend: POST /api/employees/invite
          api
            .post("/api/employees/invite", {
              emails: [addedEmail],
              message: "",
            })
            .catch(() => { });
          setShowAddModal(false);
          setCountryCode("+91");
          setForm({
            full_name: "",
            email: "",
            password: "",
            phone_number: "",
            user_role: "Consultant",
            department: "",
            address: "",
            dob: "",
            type: "",
            joining_date: "",
            profile_picture: null,
            active: "Active",
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
              active: form.active === "Active" ? "active" : "inactive",
              profile_picture: data.profile_picture || undefined,
            },
          ]);
        } else {
          setAddError(data.message || "Failed to add consultant.");
        }
      })
      .catch((err) => {
        console.error("Add consultant failed:", err);
        setAddError(
          err.response?.data?.message || "Failed to add consultant.",
        );
      })
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
      <div className="sticky z-50 bg-white mb-4 mt-2 overflow-visible">
        <div className="flex w-full min-h-[44px] flex-nowrap items-center gap-2 sm:gap-3 overflow-visible">
          <h1 className="text-[24px] font-medium text-[#000000] font-Gantari shrink-0 pr-1">
            Consultants
          </h1>
          {/* Tight gap between action buttons and Show Entries / Status (inner), title spacing unchanged */}
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-visible">
            {/* Scroll only the action buttons — avoids clipping dropdown panels */}
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
                    onClick={() => navigate("/bc/consultants/add")}
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
                <div
                  className="relative min-w-[140px] max-w-[200px] w-[150px]"
                  ref={showEntriesDropdownRef}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEntriesOpen((o) => !o);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0 min-w-0"
                  >
                    <span
                      className={`min-w-0 flex-1 truncate overflow-hidden text-left ${selectedShowEntries === ""
                          ? "text-[#8B8B8B]"
                          : "text-[#353535]"
                        }`}
                    >
                      {selectedShowEntries === "" ? (
                        SHOW_ENTRIES_PLACEHOLDER
                      ) : (
                        <>
                          <span className="text-[14px]">
                            {SHOW_ENTRIES_SELECTED_PREFIX}
                          </span>{" "}
                          <span className="font-semibold">
                            {selectedRange.label}
                          </span>
                        </>
                      )}
                    </span>
                    <img
                      src={ArrowDown}
                      alt=""
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""
                        } ${selectedShowEntries === ""
                          ? "opacity-60 grayscale"
                          : "opacity-90"
                        }`}
                      aria-hidden
                    />
                  </button>
                  {showEntriesOpen && (
                    <div className="absolute top-full right-0 left-auto mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden">
                      <div
                        ref={showEntriesDropdownContentRef}
                        className="max-h-[168px] overflow-y-auto custom-scrollbar"
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedShowEntries("");
                            setShowEntriesOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer text-[#8B8B8B] bg-[#FFFFFF] hover:text-[#353535] hover:bg-[#F2F2F2]"
                        >
                          {SHOW_ENTRIES_PLACEHOLDER}
                        </button>
                        {showEntriesOptions.map((opt) => {
                          const isChosen = selectedShowEntries === opt.value;
                          return (
                            <button
                              key={`${opt.value}-${opt.start}-${String(opt.end)}`}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedShowEntries(opt.value);
                                setShowEntriesOpen(false);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${isChosen
                                  ? "text-[#353535] bg-[#F2F2F2]"
                                  : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]"
                                }`}
                            >
                              <span className="truncate min-w-0">{opt.label}</span>
                              {isChosen && (
                                <svg
                                  className="w-4 h-4 shrink-0 text-[#353535]"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {viewMode === "card" ? (
                <CustomDropdown
                  options={["All", "Employee", "Trainee"]}
                  value={typeFilter}
                  onChange={(val) => setTypeFilter(val)}
                  placeholder="Type"
                  className="w-[100px]"
                  styleType="header"
                  alignMenu="right"
                />
              ) : (
                <CustomDropdown
                  options={["All", "Active", "Deactivate"]}
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  placeholder="Status"
                  className="w-[100px]"
                  styleType="header"
                  alignMenu="right"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative">
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
                  <div className="relative h-[128px] overflow-hidden group">
                    <div className="absolute inset-0 z-0">
                      <img
                        src={pmprofilebg}
                        alt="Background"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30" />
                    </div>

                    <div className="absolute top-3 right-3 z-10">
                      <div
                        className={`flex items-center gap-1.5 px-2 rounded-full border shadow-sm ${isEmployeeActive(emp) ? "bg-[#E0FFE8] border-emerald-100" : "bg-[#FFEEEE] border-red-100"}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${isEmployeeActive(emp) ? "bg-[#166534]" : "bg-[#E00100]"}`}
                        />
                        <span
                          className={`text-[14px] font-semibold ${isEmployeeActive(emp) ? "text-[#008F22]" : "text-[#E00100]"}`}
                        >
                          {isEmployeeActive(emp) ? "Active" : "Deactivate"}
                        </span>
                      </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 px-3 py-3 sm:px-3 sm:py-4 flex items-center gap-4 z-10">
                      <div className="w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-white overflow-hidden shrink-0 border-2 border-white shadow-sm flex items-center justify-center">
                        {emp.profile_picture && emp.profile_picture.trim() ? (
                          <img
                            src={getProfileUrl(emp.profile_picture)}
                            alt={emp.full_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <span className="text-[20px] font-semibold text-[#1A1A1A]">
                            {emp.full_name.charAt(0).toUpperCase() || "U"}
                          </span>
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

                  <div className="px-2.5 py-4 sm:px-3 sm:py-5 space-y-4 sm:space-y-5">
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
                            navigate(`/bc/consultants/edit/${emp.id}`)
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
                        const slNo = (rangeStart + idx + 1)
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
                                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
                                    {emp.profile_picture &&
                                      emp.profile_picture.trim() ? (
                                      <img
                                        src={getProfileUrl(emp.profile_picture)}
                                        alt={emp.full_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (
                                            e.target as HTMLImageElement
                                          ).style.display = "none";
                                        }}
                                      />
                                    ) : (
                                      <span className="text-gray-400 text-[10px]">
                                        No Photo
                                      </span>
                                    )}
                                  </div>
                                  <span
                                    className={`absolute top-0 left-0 w-3 h-3 border-2 border-white rounded-full ${isEmployeeActive(emp) ? "bg-[#22c55e]" : "bg-[#ef4444]"}`}
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
                                    isEmployeeActive(emp)
                                      ? "Active"
                                      : "Deactivate"
                                  }
                                  onChange={(val) =>
                                    handleStatusChange(
                                      emp.id,
                                      val === "Active" ? "active" : "inactive",
                                    )
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
                                      navigate(
                                        `/bc/consultants/edit/${emp.id}`,
                                      )
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

      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-[15px] max-w-[1174px] w-full px-[20px] py-[20px] max-h-[795px] overflow-y-auto relative">
              {/* Header Section */}
              <div className="flex items-center justify-center mb-4 relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError("");
                  }}
                  className="absolute left-0 p-2 rounded-md bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
                >
                  <FiX className="w-5 h-5 font-bold" />
                </button>
                <h3 className="text-[24px] font-medium text-[#000000] font-Gantari">
                  Add New Consultant
                </h3>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-5">
                {addError && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
                    {addError}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  {/* Left Column */}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[16px] font-medium text-[#000000] mb-1.5 font-Gantari">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Employee Name"
                        value={form.full_name}
                        onChange={(e) => {
                          const val = e.target.value.replace(/  +/g, " ");
                          setForm((f: any) => ({ ...f, full_name: val }));
                        }}
                        className="w-full px-4 py-2.5 bg-[#F2F3F4] border-none rounded-md  text-[14px] placeholder:text-[#8B8B8B] font-Gantari transition-all outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[16px] font-medium text-[#000000] mb-1.5 font-Gantari">
                        Phone Number <span className="text-[#DD4342]">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="px-3 py-2.5 text-[14px] text-[#353535] bg-[#F2F3F4] border-none rounded-md font-Gantari focus:outline-none cursor-pointer"
                        >
                          {COUNTRY_CODES.map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Enter Phone Number"
                          value={form.phone_number}
                          onChange={(e) => {
                            const digitsOnly = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 12);
                            setForm((f: any) => ({
                              ...f,
                              phone_number: digitsOnly,
                            }));
                          }}
                          maxLength={12}
                          required
                          className="flex-1 px-4 py-2.5 bg-[#F2F3F4] border-none rounded-md text-[14px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[16px] font-medium text-[#000000] mb-1.5 font-Gantari">
                        Password
                      </label>
                      <input
                        type="password"
                        placeholder="Enter Password"
                        value={form.password}
                        onChange={(e) =>
                          setForm((f: any) => ({
                            ...f,
                            password: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2.5 bg-[#F2F3F4] border-none rounded-md  text-[14px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                        required
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-[16px] font-medium text-[#000000] mb-1.5 font-Gantari">
                        Role
                      </label>
                      <div className="relative">
                        <select
                          value={form.user_role}
                          onChange={(e) =>
                            setForm((f: any) => ({
                              ...f,
                              user_role: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2.5 bg-[#F2F3F4] border-none rounded-md  text-[14px] text-[#353535] font-Gantari appearance-none cursor-pointer transition-all outline-none"
                        >
                          <option value="" disabled>
                            Select Role
                          </option>
                          {getAllowedRoles().map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#353535] pointer-events-none" />
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-[16px] font-medium text-[#000000] mb-1.5 font-Gantari">
                        Department
                      </label>
                      <div className="relative">
                        <select
                          value={form.department}
                          onChange={(e) =>
                            setForm((f: any) => ({
                              ...f,
                              department: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2.5 bg-[#F2F3F4] border-none rounded-md  text-[14px] text-[#353535] font-Gantari appearance-none cursor-pointer transition-all outline-none"
                        >
                          <option value="" disabled>
                            Select Department
                          </option>
                          {departments.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                        <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#353535] pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[14px] font-medium text-[#1A1A1A] mb-1.5 font-Gantari">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={form.dob}
                        onChange={(e) =>
                          setForm((f: any) => ({ ...f, dob: e.target.value }))
                        }
                        max={todayISO}
                        className="w-full px-4 py-2.5 bg-[#F2F3F4] border-none rounded-md focus:ring-1 focus:ring-[#D1E6FF] text-[14px] text-[#979797] font-Gantari transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-medium text-[#000000] mb-1.5 font-Gantari">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="Enter Email"
                        value={form.email}
                        onChange={(e) =>
                          setForm((f: any) => ({ ...f, email: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 bg-[#F2F3F4] border-none rounded-md focus:ring-1 focus:ring-[#D1E6FF] text-[14px] placeholder:text-[#979797] font-Gantari transition-all outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-medium text-[#000000] mb-1.5 font-Gantari">
                        Date of Joining
                      </label>
                      <input
                        type="date"
                        value={form.joining_date}
                        onChange={(e) =>
                          setForm((f: any) => ({
                            ...f,
                            joining_date: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2.5 bg-[#F2F3F4] border-none rounded-md focus:ring-1 focus:ring-[#D1E6FF] text-[14px] text-[#979797] font-Gantari transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-medium text-[#000000] mb-1.5 font-Gantari">
                        Update Profile Picture
                      </label>
                      <div className="flex bg-[#F2F3F4] rounded-md overflow-hidden transition-all focus-within:ring-1 focus-within:ring-[#D1E6FF]">
                        <div className="flex-1 px-4 py-2.5 text-[14px] text-[#979797] font-Gantari truncate">
                          {form.profile_picture
                            ? form.profile_picture.name
                            : "Choose file (JPEG or JPG only)"}
                        </div>
                        <label className="bg-[#E0E0E0] px-5 py-2.5 cursor-pointer text-[13px] font-medium text-[#353535] hover:bg-slate-300 transition-colors font-Gantari shrink-0 flex items-center justify-center">
                          Browse File
                          <input
                            type="file"
                            className="hidden"
                            accept=".jpg,.jpeg"
                            onChange={(e) =>
                              setForm((f: any) => ({
                                ...f,
                                profile_picture: e.target.files
                                  ? e.target.files[0]
                                  : null,
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-[14px] font-medium text-[#000000] mb-1.5 font-Gantari">
                        Type
                      </label>
                      <div className="relative">
                        <select
                          value={form.type || ""}
                          onChange={(e) =>
                            setForm((f: any) => ({
                              ...f,
                              type: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2.5 bg-[#F2F3F4] border-none rounded-md text-[14px] text-[#353535] font-Gantari appearance-none cursor-pointer transition-all outline-none"
                        >
                          <option value="" disabled>
                            Select Type
                          </option>
                          <option value="Trainee">Trainee</option>
                          <option value="Employee">Employee</option>
                        </select>
                        <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#353535] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#000000] mb-1.5 font-Gantari">
                    Address
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Type your Address..."
                    value={form.address}
                    onChange={(e) => {
                      const val = e.target.value.replace(/  +/g, " ");
                      setForm((f: any) => ({ ...f, address: val }));
                    }}
                    className="w-full px-4 py-2.5 bg-[#F2F3F4] border-none rounded-md focus:ring-1 focus:ring-[#D1E6FF] text-[14px] placeholder:text-[#979797] font-Gantari transition-all resize-none outline-none leading-relaxed"
                  />
                </div>

                <div className="flex gap-4 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2 rounded-md bg-[#F2F2F2] text-[#000000] font-medium text-[14px] font-Gantari cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={addSubmitting}
                    className="px-5 py-2 rounded-md bg-[#D1E6FF] text-[#000000] font-medium text-[14px] font-Gantari cursor-pointer"
                  >
                    {addSubmitting ? "Adding..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {showInviteModal &&
        createPortal(
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]">
            <div className="bg-white rounded-[15px] max-w-[873px] w-full px-4 sm:px-[30px] py-[20px] relative shadow-2xl max-h-[95vh] overflow-y-auto">
              {/* Header Section */}
              <div className="flex items-center justify-center mb-8 relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmails("");
                    setInviteMessage("");
                  }}
                  className="absolute left-0 p-2 rounded-md bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
                >
                  <FiX className="w-5 h-5 font-bold" />
                </button>
                <h3 className="text-[24px] font-semibold text-[#020202] font-Gantari text-center">
                  Invite New Consultant
                </h3>
              </div>

              <form onSubmit={handleInvite} className="space-y-6">
                <div>
                  <label className="block text-[16px] font-medium text-[#000000] mb-2 font-Gantari">
                    Email Addresses
                  </label>
                  <textarea
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-md text-[14px] placeholder:text-[#666666] font-Gantari transition-all outline-none resize-none leading-relaxed"
                    placeholder="Enter Multiple Email addresses separated by commas,"
                  />
                  <p className="text-[12px] text-[#666666] mt-2 font-Gantari">
                    Separate multiple emails with commas (eg., email01@eg.com)
                  </p>
                </div>

                <div>
                  <label className="block text-[16px] font-medium text-[#000000] mb-2 font-Gantari">
                    Invitation Message
                  </label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-md text-[14px] placeholder:text-[#666666] font-Gantari transition-all outline-none resize-none leading-relaxed"
                    placeholder="Enter your Invitation Message."
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="px-5 py-2 rounded-md bg-[#D1E6FF] text-[#000000] font-medium text-[14px] font-Gantari cursor-pointer"
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]">
            <div className="bg-white rounded-[15px] max-w-[850px] w-full px-4 sm:px-[40px] py-[20px] sm:py-[30px] relative shadow-2xl max-h-[95vh] flex flex-col">
              {/* Header Section */}
              <div className="flex items-center justify-center mb-6 relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowInactiveModal(false);
                    setInactiveIds([]);
                  }}
                  className="absolute left-0 p-2 rounded-md bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer"
                >
                  <FiX className="w-5 h-5 font-bold" />
                </button>
                <h3 className="text-[24px] font-medium text-[#000000] font-Gantari">
                  Manage In-active Consultants
                </h3>
              </div>

              <div className="shrink-0 mb-6">
                <p className="text-[15px] text-[#353535] font-Gantari mb-4 leading-relaxed">
                  Select Consultants to mark as IN-Active. In-Active Consultants
                  will not appear in Project Assignment dropdowns.
                </p>
                <p className="text-[16px] font-bold text-[#3d3399] font-Gantari">
                  {inactiveIds.length} Consultant(s) will be marked as In-Active
                </p>
              </div>

              {/* List Area */}
              <div className="flex-1 overflow-y-auto border border-[#E0E0E0] rounded-[10px] custom-scrollbar">
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
                      <div className="px-5 py-3 bg-white font-bold text-[15px] text-[#000000] font-Gantari border-b border-[#E0E0E0]">
                        {role}
                      </div>
                      <div className="divide-y divide-[#F0F0F0]">
                        {emps.map((emp, idx) => (
                          <div
                            key={emp.id}
                            className={`flex items-center justify-between px-5 py-3.5 transition-colors ${idx % 2 === 1 ? "bg-[#F9F9F9]" : "bg-white"}`}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                onClick={() =>
                                  setInactiveIds((prev) =>
                                    prev.includes(emp.id)
                                      ? prev.filter((id) => id !== emp.id)
                                      : [...prev, emp.id],
                                  )
                                }
                                className={`w-5 h-5 rounded-md border-2 cursor-pointer flex items-center justify-center transition-all ${inactiveIds.includes(emp.id) ? "bg-[#D1E6FF] border-[#D1E6FF]" : "bg-white border-[#E0E0E0]"}`}
                              >
                                {inactiveIds.includes(emp.id) && (
                                  <svg
                                    width="14"
                                    height="11"
                                    viewBox="0 0 14 11"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M1 5L5 9L13 1"
                                      stroke="#1A1A1A"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                              <span className="text-[15px] font-medium text-[#353535] font-Gantari">
                                {emp.full_name}{" "}
                                {emp.empid ? `(${emp.empid})` : ""}
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
                  onClick={() => {
                    setShowInactiveModal(false);
                    setInactiveIds([]);
                  }}
                  className="px-5 py-2 rounded-md bg-[#F2F2F2] text-[#000000] font-medium text-[14px] font-Gantari cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleInactive}
                  disabled={!inactiveIds.length || inactiveSubmitting}
                  className="px-5 py-2 rounded-md bg-[#D1E6FF] text-[#000000] font-medium text-[14px] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-Gantari cursor-pointer"
                >
                  {inactiveSubmitting ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {showDetailsModal &&
        selectedEmployee &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]">
            <div className="bg-white rounded-md max-w-[520px] w-full px-[20px] py-[20px] relative shadow-2xl flex flex-col gap-6 font-Gantari">
              {/* Header */}
              <div className="flex items-center justify-center relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedEmployee(null);
                  }}
                  className="absolute left-0 p-2 rounded-md bg-[#F2F2F2] text-[#1A1A1A] transition-all cursor-pointer"
                >
                  <FiX className="w-5 h-5 font-bold" />
                </button>
                <h3 className="text-[24px] font-medium text-[#000000]">
                  View Details
                </h3>
              </div>

              {/* Profile Section */}
              <div className="flex items-center gap-6 px-4">
                <div className="w-[48px] h-[48px] rounded-full overflow-hidden bg-[#F4F4F4] shrink-0 border-2 border-white shadow-sm">
                  <img
                    src={
                      selectedEmployee.profile_picture
                        ? getProfileUrl(selectedEmployee.profile_picture)
                        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmployee.email}`
                    }
                    alt={selectedEmployee.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmployee.email}`;
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-[18px] font-medium text-[#000000]">
                    {selectedEmployee.full_name}
                  </h4>
                  <p className="text-[14px] font-medium text-[#353535]">
                    {selectedEmployee.empid ||
                      `EMP-${String(selectedEmployee.id).padStart(4, "0")}`}
                  </p>
                </div>
              </div>

              {/* Details Table */}
              <div className="px-8 space-y-2 pt-2">
                {[
                  { label: "Date of Birth", value: selectedEmployee.dob },
                  {
                    label: "Phone Number",
                    value: selectedEmployee.phone_number,
                  },
                  { label: "Email ID", value: selectedEmployee.email },
                  { label: "Type", value: selectedEmployee.user_type },
                  { label: "User Role", value: selectedEmployee.user_role },
                  { label: "Address", value: selectedEmployee.address },
                  { label: "Joined Date", value: selectedEmployee.doj },
                  { label: "Department", value: selectedEmployee.department },
                  {
                    label: "Account Number",
                    value: selectedEmployee.accountnumber,
                  },
                  { label: "Salary", value: selectedEmployee.salary },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[140px_20px_1fr] text-[14px] gap-15"
                  >
                    <span className="font-semibold text-[14px] font-Gantari text-[#020202] ">
                      {item.label}
                    </span>
                    <span className="text-[#020202] text-[14px] font-Gantari text-center ">
                      :
                    </span>
                    <span className="text-[#616161] text-[14px] font-Gantari font-medium break-words">
                      {item.value}
                    </span>
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
