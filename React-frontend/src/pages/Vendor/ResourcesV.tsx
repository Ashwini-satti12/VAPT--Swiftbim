import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { FiGrid, FiMenu, FiX } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import { COUNTRY_CODES, getPhoneLength } from "../../utils/countryCodes";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import pmprofilebg from "../../assets/ProjectManager/consultant/pmprofilebg.jpg";
import mailIcon from "../../assets/ProjectManager/consultant/mailIcon.svg";
import messageIcon from "../../assets/ProjectManager/consultant/messageIcon.svg";
import callIcon from "../../assets/ProjectManager/consultant/callIcon.svg";
import eyeIcon from "../../assets/ProjectManager/consultant/eyeIcon.svg";
import editIcon from "../../assets/ProjectManager/consultant/editIcon.svg";
import { VendorUploadPreviewModal } from "../../components/VendorUploadPreviewModal";
import { sanitizeVendorVendorsFilename } from "../../lib/vendorUploads";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";

const SHOW_ENTRIES_PLACEHOLDER = "Show Entries";

const VENDOR_RESOURCE_BULK_STATUS =
  "/api/vendors/profile/resource-profiles/bulk-status";

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

  // vendor_resource_profiles fields (new_swiftbim)
  designation?: string;
  discipline?: string;
  years_of_experience?: string;
  expertise?: string;
  resource_role?: string;
  software?: string;
  certifications?: string;
  projects_worked_on?: string;
}

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
        className={`w-full flex items-center justify-between gap-2 transition-all outline-none font-Gantari min-w-0 ${
          styleType === "header"
            ? "px-3 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold"
            : styleType === "table"
              ? `px-4 py-2 min-w-[140px] rounded-md border font-Gantari font-medium text-[14px] ${value === "Active" ? "bg-[#E1F6EB] border-[#A7F3D0] text-[#008F22]" : "bg-[#FFE5E5] border-[#FECACA] text-[#E00100]"}`
              : `px-5 py-3 bg-[#F2F3F4] rounded-md text-[14px] border border-[#F2F2F2] focus:outline-none focus:border-[#AEACAC52] focus:ring-1 focus:ring-[#AEACAC52] ${isOpen ? "!border-[#AEACAC52]" : ""}`
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
              <span className="text-[14px]">
                {placeholder === "Show"
                  ? SHOW_ENTRIES_PLACEHOLDER
                  : placeholder}
                :
              </span>{" "}
              <span className="font-semibold">{value}</span>
            </>
          ) : (
            value ||
            (placeholder === "Show" ? SHOW_ENTRIES_PLACEHOLDER : placeholder)
          )}
        </span>
        <img
          src={ArrowDown}
          alt="arrow"
          className={`w-4 h-4 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""} ${styleType === "table" ? "opacity-70" : isPlaceholder ? "opacity-60 grayscale" : "opacity-90"}`}
        />
      </button>
      {isOpen && (
        <div
          className={`absolute top-full mt-1 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[200] overflow-hidden ${alignMenu === "right" ? "right-0 left-auto" : "left-0"}`}
        >
          <div
            className={`${menuMaxHeightClass} overflow-y-auto custom-scrollbar`}
          >
            {(styleType === "header" || styleType === "form") && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-[14px] transition-colors font-Gantari cursor-pointer hover:text-[#353535] hover:bg-[#F2F2F2] ${isPlaceholder ? "text-[#353535] bg-[#F2F2F2]" : "text-[#8B8B8B] bg-[#FFFFFF]"}`}
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
                className={`w-full text-left px-4 py-2 text-[14px] font-Gantari font-normal transition-colors cursor-pointer hover:text-[#353535] hover:bg-[#F2F2F2] ${value === option ? "text-[#353535] bg-[#F2F2F2]" : "text-[#8B8B8B] bg-transparent"}`}
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

const VENDOR_ROLE_OPTIONS = ["Vendor PM", "Vendor Bim Lead", "Vendor Employee"];
const ROLE_OPTIONS_FALLBACK = VENDOR_ROLE_OPTIONS;

export default function ResourcesV() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.textContent = SCROLLBAR_STYLE;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  const { user } = useAuth();
  const [activeView, setActiveView] = useState<
    "list" | "add" | "edit" | "invite" | "inactive"
  >("list");
  const [countryCode, setCountryCode] = useState("+91");
  const [editCountryCode, setEditCountryCode] = useState("+91");
  const [list, setList] = useState<Employee[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const [addSubmitting, _setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    dob: "",
    phone_number: "",
    email: "",
    password: "",
    type: "",
    user_role: "",
    joining_date: "",
    department: "",
    address: "",
    salary: "",
    accountnumber: "",
    roles: [] as string[],
    profile_picture: null as File | null,
    active: "Active",
  });
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  /** Inline success state on Invite Team view (same page, not a fixed toast). */
  const [inviteShowSuccess, setInviteShowSuccess] = useState(false);
  const [inactiveIds, setInactiveIds] = useState<number[]>([]);
  const [inactiveSubmitting, setInactiveSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    user_role: "",
    department: "",
    address: "",
    dob: "",
    password: "",
    user_type: "",
    doj: "",
    salary: "",
    accountnumber: "",
    profile_picture: null as File | null,
    roles: [] as string[],
    active: "Active",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [certificationPreviewRaw, setCertificationPreviewRaw] = useState<
    string | null
  >(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const isVpmRoute = location.pathname.startsWith("/vpm/");

  const openEmailClient = (email?: string) => {
    const mail = (email || "").trim();
    if (!mail) {
      alert(
        "Email is not assigned for this resource. Please open Edit Details and assign Login Email first.",
      );
      return;
    }
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(mail)}`;
    const popup = window.open(gmailComposeUrl, "_blank", "noopener,noreferrer");
    // If popup is blocked or Gmail cannot open, fall back to default mail app.
    if (!popup) {
      window.location.href = `mailto:${mail}`;
    }
  };

  const openDialer = (phone?: string) => {
    const raw = (phone || "").trim();
    const sanitized = raw.replace(/[^\d+]/g, "");
    if (!sanitized) {
      alert("Phone number is not available for this resource.");
      return;
    }
    window.location.href = `tel:${sanitized}`;
  };

  // Vendor company admin should always be able to assign logins to resources
  const canAdd = user?.user_type === "vendor" || user?.panel_type === 1;

  const getWhatsAppLink = (rawPhone?: string) => {
    const digits = String(rawPhone || "").replace(/\D/g, "");
    if (!digits) return "";
    const normalized = digits.replace(/^00/, "").replace(/^0+/, "");
    return normalized ? `https://wa.me/${normalized}` : "";
  };

  useEffect(() => {
    // Vendor roles are fixed for assignment
    setRoleOptions(VENDOR_ROLE_OPTIONS);
    setDepartmentOptions([]);
  }, []);

  useEffect(() => {
    // Load vendor resource profiles from new_swiftbim by vendor_id
    api
      .get<{
        resources?: Array<{
          id: number;
          name?: string;
          email?: string;
          login_email?: string;
          contact_email?: string;
          phone_number?: string;
          mobile?: string;
          contact_number?: string;
          phone?: string;
          login_role?: string;
          designation?: string;
          discipline?: string;
          years_of_experience?: string;
          expertise?: string;
          role?: string;
          software?: string;
          certifications?: string;
          projects_worked_on?: string;
          address?: string;
          active?: string;
        }>;
      }>("/api/vendors/profile/resource-profiles")
      .then(({ data }) => {
        const rows = data.resources ?? [];
        setList(
          rows.map(
            (r) => {
              const resolvedEmail =
                (r.email || "").trim() ||
                (r.login_email || "").trim() ||
                (r.contact_email || "").trim();
              const resolvedPhone =
                (r.phone_number || "").trim() ||
                (r.mobile || "").trim() ||
                (r.contact_number || "").trim() ||
                (r.phone || "").trim();
              return {
                id: r.id,
                full_name: r.name || "—",
                email: resolvedEmail,
                user_role: r.login_role || "",
                active:
                  String(r.active ?? "active").toLowerCase() === "inactive"
                    ? "inactive"
                    : "active",
                department: "Vendor",
                user_type: "vendor",
                profile_picture: undefined,
                Allpannel: "Vendor",
                phone_number: resolvedPhone,
                address: (r.address || "").trim(),
                doj: "",
                dob: "",
                designation: r.designation,
                discipline: r.discipline,
                years_of_experience: r.years_of_experience,
                expertise: r.expertise,
                resource_role: r.role,
                software: r.software,
                certifications: r.certifications,
                projects_worked_on: r.projects_worked_on,
              } as Employee;
            },
          ),
        );
      })
      .catch((err) => {
        console.error("Failed to load vendor resources:", err);
        setList([]);
      });
  }, []);

  const editParam = searchParams.get("edit");
  useEffect(() => {
    if (editParam && list.length) {
      const id = parseInt(editParam, 10);
      const emp = list.find((e) => e.id === id);
      if (emp) {
        setEditId(id);
        setActiveView("edit");

        const savedPhone = emp.phone_number || "";
        let foundCode = "+91";
        let phoneWithoutCode = savedPhone;

        for (const c of COUNTRY_CODES) {
          if (savedPhone.startsWith(c)) {
            foundCode = c;
            phoneWithoutCode = savedPhone.slice(c.length);
            break;
          }
        }
        setEditCountryCode(foundCode);

        setEditForm({
          full_name: emp.full_name,
          email: emp.email,
          phone_number: phoneWithoutCode,
          user_role: emp.user_role || "",
          department: emp.department || "",
          address: emp.address || "",
          dob: emp.dob || "",
          password: "",
          user_type: emp.user_type || "",
          doj: emp.doj || "",
          salary: emp.salary || "",
          accountnumber: emp.accountnumber || "",
          profile_picture: null,
          roles: emp.Allpannel
            ? emp.Allpannel.split(",").map((r) => r.trim())
            : [],
          active: emp.active === "active" ? "Active" : "Deactivate",
        });
      }
    }
  }, [editParam, list]);

  const filteredList = list.filter((emp: Employee) => {
    if (statusFilter === "All") return true;
    const currentStatus = (emp.active || "").toLowerCase();
    if (statusFilter === "Active") return currentStatus === "active";
    if (statusFilter === "Inactive") return currentStatus !== "active";
    return true;
  });

  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  function renderProfileCertificationsCard() {
    const certList = selectedEmployee?.certifications?.trim();
    if (!certList || !selectedEmployee) return null;
    const certRaw = certList.split(",")[0].trim();
    const displayName =
      sanitizeVendorVendorsFilename(certRaw) ||
      certRaw.split(/[/\\]/).pop() ||
      certRaw;
    return (
      <div className="py-3 w-full max-w-xl">
        <p className="text-[#353535] font-gantari text-[14px] font-medium mb-2">
          Certifications
        </p>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
          <span
            className="text-[13px] text-[#334155] font-gantari font-medium truncate min-w-0"
            title={displayName}
          >
            {displayName}
          </span>
          <button
            type="button"
            onClick={() => setCertificationPreviewRaw(certRaw)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold font-gantari text-[#DD4342] bg-white border border-[#E2E8F0] hover:bg-[#FFF5F5] hover:border-[#DD4342]/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DD4342]/40"
          >
            View
          </button>
        </div>
      </div>
    );
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
        toast.success("Invitations sent successfully!");
        setInviteEmails("");
        setInviteMessage("");
        setInviteShowSuccess(true);
        setActiveView("list");
      })
      .catch(() => {})
      .finally(() => setInviteSubmitting(false));
  }

  function handleInactive() {
    if (!inactiveIds.length) return;
    setInactiveSubmitting(true);
    api
      .post(VENDOR_RESOURCE_BULK_STATUS, {
        ids: inactiveIds,
        action: "inactive",
      })
      .then(() => {
        toast.success("Resources deactivated successfully!");
        setList((prev) =>
          prev.map((e) =>
            inactiveIds.includes(e.id) ? { ...e, active: "inactive" } : e,
          ),
        );
        setActiveView("list");
        setInactiveIds([]);
      })
      .catch(() => {
        toast.error("Failed to deactivate resources.");
      })
      .finally(() => setInactiveSubmitting(false));
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditSubmitting(true);
    const cleanPhone = editForm.phone_number.replace(/\D/g, "");
    const expectedLength = getPhoneLength(editCountryCode);
    if (!cleanPhone || cleanPhone.length !== expectedLength) {
      setAddError(
        `Phone number must be exactly ${expectedLength} digits for ${editCountryCode}.`,
      );
      setEditSubmitting(false);
      return;
    }

    api
      .post<{ success: boolean; message?: string; email_sent?: boolean }>(
        `/api/vendors/profile/resource-profiles/${editId}/assign-login`,
        {
          email: editForm.email.trim(),
          role: editForm.user_role,
          full_name: editForm.full_name.trim(),
          phone_number: `${editCountryCode}${cleanPhone}`,
          // When editing, treat the password field as the login password
          // for this resource. If left blank, backend will keep the
          // existing password instead of changing it.
          password: editForm.password || undefined,
        },
      )
      .then(({ data }) => {
        if (!data.success) throw new Error(data.message || "Failed");
        // Optimistically update list so UI reflects latest edits without reload
        setList((prev) =>
          prev.map((e) =>
            e.id === editId
              ? {
                  ...e,
                  full_name: editForm.full_name.trim(),
                  email: editForm.email.trim(),
                  user_role: editForm.user_role,
                  phone_number: editForm.phone_number.trim() || e.phone_number,
                }
              : e,
          ),
        );
        toast.success("Login assigned successfully!");
        setEditId(null);
        setActiveView("list");
        setSearchParams({});
      })
      .catch((err) => {
        setAddError(
          err.response?.data?.message ||
            err.message ||
            "Failed to assign login",
        );
      })
      .finally(() => setEditSubmitting(false));
  }

  function handleStatusToggle(id: number, newStatus: string) {
    const status = newStatus.toLowerCase() === "active" ? "active" : "inactive";
    setList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, active: status } : e)),
    );
    api
      .post(VENDOR_RESOURCE_BULK_STATUS, { ids: [id], action: status })
      .then(() => {
        toast.success("Status updated successfully!");
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to update status.");
      });
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddError(
      "Add Resource Profiles from Company Profile → Resources tab. Here you assign login (email + role) to existing resources.",
    );
  }

  const renderList = () => (
    <>
      <div className="sticky z-50 bg-white overflow-visible px-2 mb-4">
        <div className="flex flex-col sm:flex-row w-full min-h-[44px] items-start sm:items-center gap-3 sm:gap-3 overflow-visible">
          <h2 className="sm:text-[20px] md:text-[24px] font-medium text-[#000000] font-Gantari">
            {isVpmRoute ? "Vendor Project Manager Resources" : "Resources"}
          </h2>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:flex-1 sm:justify-end overflow-visible">
            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 py-1 overflow-visible">
              {canAdd && (
                <>
                  <div className="group relative">
                    <button
                      onClick={() => setViewMode("table")}
                      className={`shrink-0 p-2 rounded-full transition-all cursor-pointer ${viewMode === "table" ? "bg-[#DD4342] text-[#F2F2F2]" : "bg-[#E0E0E0] text-[#000000]"} border-0 shadow-none`}
                    >
                      <FiMenu className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                      <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                      <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-4 py-0.5 relative z-10">
                        <span className="font-gantari text-[14px] font-semibold text-[#353535] whitespace-nowrap">List</span>
                      </div>
                    </div>
                  </div>
                  <div className="group relative">
                    <button
                      onClick={() => setViewMode("card")}
                      className={`shrink-0 p-2 rounded-full transition-all cursor-pointer ${viewMode === "card" ? "bg-[#DD4342] text-[#F2F2F2]" : "bg-[#E0E0E0] text-[#000000]"} border-0 shadow-none`}
                    >
                      <FiGrid className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                      <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                      <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-4 py-0.5 relative z-10">
                        <span className="font-gantari text-[14px] font-semibold text-[#353535] whitespace-nowrap">Grid</span>
                      </div>
                    </div>
                  </div>
                  {/* <button
                    onClick={() => setActiveView("add")}
                    className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-[15px] font-Gantari font-semibold whitespace-nowrap cursor-pointer"
                  >
                    Add Worker
                  </button> */}
                  <div className="group relative">
                    <button
                      onClick={() => {
                        setInviteShowSuccess(false);
                        setActiveView("invite");
                      }}
                      className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-[15px] font-Gantari font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Invite
                    </button>
                    
                  </div>
                  <div className="group relative">
                    <button
                      onClick={() => setActiveView("inactive")}
                      className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-[#DD4342] text-[#F2F2F2] text-[13px] sm:text-[15px] font-Gantari font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Manage Inactive
                    </button>
                    
                  </div>
                </>
              )}
            </div>
            <div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2 overflow-visible">
              <CustomDropdown
                options={["All", "Online", "Offline"]}
                value={
                  statusFilter === "All"
                    ? ""
                    : statusFilter === "Active"
                      ? "Online"
                      : statusFilter === "Inactive"
                        ? "Offline"
                        : ""
                }
                onChange={(val) => {
                  const mapped =
                    val === "Online"
                      ? "Active"
                      : val === "Offline"
                        ? "Inactive"
                        : "All";
                  setStatusFilter(mapped);
                  setCurrentPage(1);
                }}
                placeholder="Type"
                className="w-full sm:w-[130px]"
                styleType="header"
                alignMenu="right"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5 p-3">
            {filteredList.length === 0 ? (
              <div className="col-span-full bg-white rounded-md border border-slate-200 p-8 sm:p-12 text-center text-slate-500 shadow-sm font-gantari">
                No resources found.
              </div>
            ) : (
              filteredList.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white rounded-[10px] overflow-hidden border border-slate-200 transition-all hover:shadow-md"
                >
                  <div className="relative h-[128px] overflow-hidden group">
                    <img
                      src={pmprofilebg}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    
                    <div className="absolute top-3 right-3 z-10">
                      <div
                        className={`flex items-center gap-1.5 px-2 rounded-full border shadow-sm ${emp.active === "active" ? "bg-[#E0FFE8] border-emerald-100" : "bg-[#FFEEEE] border-red-100"}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${emp.active === "active" ? "bg-[#166534]" : "bg-[#E00100]"}`}
                        />
                         <span className={`text-[14px] font-semibold font-gantari ${emp.active === "active" ? "text-[#008F22]" : "text-[#E00100]"}`}>
                          {emp.active === "active" ? "Active" : "Deactivate"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="absolute inset-x-0 bottom-0 px-3 py-3 sm:px-3 sm:py-4 flex items-center gap-4 z-10">
                      <div className="w-14 h-14 sm:w-15 sm:h-15 rounded-full border-2 border-white overflow-hidden bg-white shrink-0 shadow-sm">
                        {emp.profile_picture ? (
                          <img
                            src={getGlobalProfileUrl(
                              emp.id,
                              emp.profile_picture,
                            )}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-[#8B8B8B] font-bold text-xs font-gantari">
                            No Photo
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[18px] sm:text-[20px] font-Gantari font-medium text-[#F2F2F2] leading-tight tracking-tight truncate">
                          {toCamelCase(emp.full_name)}
                        </h3>
                        <p className="text-[14px] sm:text-[16px] text-[#F2F2F2] mt-1 font-gantari">
                          {emp.user_role || "Not assigned"}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-2 py-4 sm:px-3 sm:py-5 space-y-4 sm:space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openEmailClient(emp.email)}
                        className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-md text-[#12141D] text-[12px] sm:text-[14px] font-medium font-Gantari cursor-pointer"
                      >
                        <img src={mailIcon} className="w-4 h-4" />
                        Mail
                      </button>
                      <button
                        onClick={() => {
                          const waLink = getWhatsAppLink(emp.phone_number);
                          if (waLink)
                            window.open(waLink, "_blank", "noopener,noreferrer");
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-md text-[#12141D] text-[12px] sm:text-[14px] font-medium font-Gantari cursor-pointer"
                      >
                        <img src={messageIcon} className="w-4 h-4" />
                        Message
                      </button>
                      <button
                        onClick={() => openDialer(emp.phone_number)}
                        className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-[#DBE9FE] rounded-md text-[#12141D] text-[12px] sm:text-[14px] font-medium font-Gantari cursor-pointer"
                      >
                        <img src={callIcon} className="w-4 h-4" />
                        Call
                      </button>
                    </div>

                    <hr className="border-slate-200" />

                    <div className="grid grid-cols-2 gap-2">
                       <div className="relative group">
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setShowDetailsModal(true);
                            setEditForm({
                              full_name: emp.full_name,
                              email: emp.email,
                              phone_number: emp.phone_number || "",
                              user_role: emp.user_role || "",
                              department: emp.department || "",
                              address: emp.address || "",
                              dob: emp.dob || "",
                              password: "",
                              user_type: emp.user_type || "",
                              doj: emp.doj || "",
                              salary: emp.salary || "",
                              accountnumber: emp.accountnumber || "",
                              roles: emp.Allpannel
                                ? emp.Allpannel.split(",").map((r) => r.trim())
                                : [],
                              active:
                                emp.active === "active" ? "Active" : "Deactivate",
                              profile_picture: null,
                            });
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-[#DD4342] text-white rounded-md text-[12px] sm:text-[14px] font-medium font-gantari cursor-pointer"
                        >
                          <img src={eyeIcon} className="w-4 h-4 brightness-0 invert" />
                          View
                        </button>
                        
                      </div>

                      {canAdd && (
                         <div className="relative group">
                          <button
                            onClick={() => {
                              setEditId(emp.id);
                              setActiveView("edit");
                              setEditForm({
                                full_name: emp.full_name,
                                email: emp.email,
                                phone_number: emp.phone_number || "",
                                user_role: emp.user_role || "",
                                department: emp.department || "",
                                address: emp.address || "",
                                dob: emp.dob || "",
                                password: "",
                                user_type: emp.user_type || "",
                                doj: emp.doj || "",
                                salary: emp.salary || "",
                                accountnumber: emp.accountnumber || "",
                                roles: emp.Allpannel
                                  ? emp.Allpannel.split(",").map((r) => r.trim())
                                  : [],
                                active:
                                  emp.active === "active"
                                    ? "Active"
                                    : "Deactivate",
                                profile_picture: null,
                              });
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-[#F2F2F2] text-[#353535] rounded-md text-[12px] sm:text-[14px] font-medium font-gantari cursor-pointer"
                          >
                            <img src={editIcon} className="w-4 h-4" />
                            Edit
                          </button>
                         
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative mx-4">
            <div className="overflow-x-auto overflow-y-auto custom-scrollbar smooth-scroll flex-1 min-h-[280px] max-h-[calc(100vh-220px)]">
              <table className="min-w-full border-collapse">
                <thead className="relative after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                  <tr className="border-b border-gray-100 bg-white">
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">
                      Sl.No
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">
                      Name
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">
                      Email
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">
                      Contact
                    </th>
                    <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-Gantari whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedList.map((emp, idx) => (
                    <tr
                      key={emp.id}
                      className={idx % 2 === 1 ? "bg-[#F2F2F2]" : "bg-white"}
                    >
                      <td className="px-3 py-5 text-center text-[14px] text-[#353535] font-Gantari whitespace-nowrap align-middle">
                        {(idx + 1).toString().padStart(2, "0")}
                      </td>
                      <td className="px-3 py-5 text-center whitespace-nowrap align-middle lg:min-w-[200px]">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                            {emp.profile_picture ? (
                              <img
                                src={getGlobalProfileUrl(
                                  emp.id,
                                  emp.profile_picture,
                                )}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[14px] font-medium">
                                ?
                              </div>
                            )}
                          </div>
                          <span className="text-[14px] font-medium text-[#353535]">
                            {toCamelCase(emp.full_name)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-5 text-center text-[14px] text-[#353535] font-Gantari whitespace-nowrap align-middle">
                        {emp.email}
                      </td>
                      <td className="px-3 py-5 text-center whitespace-nowrap align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEmailClient(emp.email)}
                            className="w-8 h-8 rounded-full bg-[#E8F1FF] flex items-center justify-center cursor-pointer"
                          >
                            <img src={mailIcon} className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const waLink = getWhatsAppLink(emp.phone_number);
                              if (waLink)
                                window.open(
                                  waLink,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                            }}
                            className="w-8 h-8 rounded-full bg-[#E8F1FF] flex items-center justify-center cursor-pointer"
                          >
                            <img src={messageIcon} className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDialer(emp.phone_number)}
                            className="w-8 h-8 rounded-full bg-[#E8F1FF] flex items-center justify-center cursor-pointer"
                          >
                            <img src={callIcon} className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-block min-w-[130px]">
                          <CustomDropdown
                            options={["Active", "Deactivate"]}
                            value={
                              emp.active === "active" ? "Active" : "Deactivate"
                            }
                            onChange={(v) => handleStatusToggle(emp.id, v)}
                            placeholder="Status"
                            styleType="table"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          <div className="bg-white rounded-md w-full max-w-3xl relative flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between p-5 sm:p-8 shrink-0 gap-4">
              <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-4">
              <div className="group relative order-1">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 rounded-md bg-[#F2F2F2] text-[#000000] cursor-pointer border-0 shadow-none"
                >
                  <FiX className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] whitespace-nowrap">Close</span>
                  </div>
                </div>
              </div>
                <span
                  className={`px-4 py-1 rounded-full text-[12px] font-medium shrink-0 sm:hidden ${selectedEmployee.active === "active" ? "bg-[#E0FFE8] text-[#008F22]" : "bg-[#FFEEEE] text-[#E00100]"}`}
                >
                  ●{" "}
                  {selectedEmployee.active === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex-1 text-center sm:mx-6 min-w-0">
                <h3 className="text-[20px] sm:text-[24px] font-medium text-[#000000] font-gantari break-words">
                  {toCamelCase(selectedEmployee.full_name)}
                </h3>
                <p className="text-[#353535] text-[14px] sm:text-[16px] font-medium font-gantari opacity-80">
                  {selectedEmployee.user_role || "Worker"}
                </p>
              </div>

              <span
                className={`hidden sm:inline px-4 py-1 rounded-full text-[12px] font-medium shrink-0 mt-2 ${selectedEmployee.active === "active" ? "bg-[#E0FFE8] text-[#008F22]" : "bg-[#FFEEEE] text-[#E00100]"}`}
              >
                ● {selectedEmployee.active === "active" ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-8 pb-8">
              <div className="flex flex-col text-left max-w-2xl mx-auto">
                {[
                  { label: "Login Email", value: selectedEmployee.email },
                  {
                    label: "Phone Number",
                    value: selectedEmployee.phone_number,
                  },
                  { label: "Role", value: selectedEmployee.user_role },
                  { label: "Designation", value: selectedEmployee.designation },
                  { label: "Discipline", value: selectedEmployee.discipline },
                  {
                    label: "Years of Experience",
                    value: selectedEmployee.years_of_experience,
                  },
                  {
                    label: "Resource Role",
                    value: selectedEmployee.resource_role,
                  },
                  { label: "Expertise", value: selectedEmployee.expertise },
                  { label: "Software", value: selectedEmployee.software },
                  {
                    label: "Projects Worked On",
                    value: selectedEmployee.projects_worked_on,
                  },
                  { label: "Address", value: selectedEmployee.address },
                ].map(({ label, value }) =>
                  value ? (
                    <div
                      key={label}
                      className="grid grid-cols-1 sm:flex sm:items-center py-2 gap-1 sm:gap-6"
                    >
                      <span className="text-[#353535] font-gantari text-[14px] font-medium sm:w-52 shrink-0">
                        {label}
                      </span>
                      <span className="hidden sm:inline text-[#353535] font-gantari text-[14px] font-medium shrink-0">
                        :
                      </span>
                      <span className="text-[#000000] font-gantari text-[14px] font-semibold break-words">
                        {value}
                      </span>
                    </div>
                  ) : null,
                )}
                {renderProfileCertificationsCard()}
              </div>

              {canAdd && (
                <div
                  id="assign-login-section"
                  className="mt-8 border-t border-[#F0F0F0] pt-6"
                >
                  {/* <h4 className="text-sm font-bold text-[#353535] mb-4">
                                    {selectedEmployee.email ? 'Edit Login' : 'Assign Login'}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#717171] mb-1">Login Email</label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                            className="w-full px-3 py-2 bg-[#F4F4F4] rounded-lg border-none text-sm outline-none focus:ring-1 focus:ring-[#DD4342]/30"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#717171] mb-1">Role</label>
                                        <CustomDropdown
                                            options={VENDOR_ROLE_OPTIONS}
                                            value={editForm.user_role}
                                            onChange={(v) => setEditForm({ ...editForm, user_role: v })}
                                            placeholder="Select Role"
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowDetailsModal(false)}
                                            className="px-4 py-2 text-sm font-semibold bg-[#F4F4F4] text-[#353535] rounded-lg hover:bg-slate-200 transition-colors"
                                        >
                                            Close
                                        </button>
                                        <button
                                            type="button"
                                            disabled={editSubmitting}
                                            onClick={() => {
                                                if (!selectedEmployee) return;
                                                setEditId(selectedEmployee.id);
                                                handleEditSubmit(new Event('submit') as any);
                                            }}
                                            className="px-4 py-2 text-sm font-semibold bg-[#DD4342] text-white rounded-lg hover:bg-[#c93d3d] transition-colors disabled:opacity-60"
                                        >
                                            {editSubmitting ? 'Saving…' : 'Save Login'}
                                        </button>
                                    </div>
                                </div> */}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {certificationPreviewRaw && (
        <VendorUploadPreviewModal
          fileName={certificationPreviewRaw}
          onClose={() => setCertificationPreviewRaw(null)}
        />
      )}

      {activeView === "list" ? (
        renderList()
      ) : (
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-white custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    setInviteShowSuccess(false);
                    setActiveView("list");
                  }}
                  className="p-2 rounded-md bg-[#F2F2F2] text-[#616161] transition-all cursor-pointer"
                >
                  <img src={backIcon} alt="Back" className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-2 py-0.5 relative z-10">
                    <span className="font-gantari text-[14px] font-semibold text-[#353535] whitespace-nowrap">Go Back</span>
                  </div>
                </div>
              </div>
              <h3 className="sm:text-[24px] font-gantari font-semibold text-[#020202] text-center flex-1">
                {activeView === "add"
                  ? "Add New Worker"
                  : activeView === "edit"
                    ? "Edit Resource Details"
                    : activeView === "invite"
                      ? "Invite Team"
                      : "Manage Workers"}
              </h3>
              <div className="w-10" />
            </div>

            {activeView === "add" || activeView === "edit" ? (
              <form
                onSubmit={
                  activeView === "add" ? handleAddSubmit : handleEditSubmit
                }
                className="space-y-8"
              >
                {addError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold">
                    {addError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[16px] font-medium font-gantari text-[#000000] mb-2">
                        Full Name
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        placeholder="Worker Full Name"
                        placeholder-class="text-[#353535] text-[14px] font-medium font-gantari"
                        value={
                          activeView === "add"
                            ? form.full_name
                            : editForm.full_name
                        }
                        onChange={(e) =>
                          activeView === "add"
                            ? setForm({ ...form, full_name: e.target.value })
                            : setEditForm({
                                ...editForm,
                                full_name: e.target.value,
                              })
                        }
                        className="w-full px-5 py-3 bg-[#F2F3F4] rounded-md border border-[#F2F2F2] focus:outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#AEACAC52] text-[#353535] text-[14px] font-medium transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[16px] font-medium font-gantari text-[#000000] mb-2">
                        Email Address
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="email@example.com"
                        placeholder-class="text-[#353535] text-[14px] font-medium font-gantari"
                        value={
                          activeView === "add" ? form.email : editForm.email
                        }
                        onChange={(e) =>
                          activeView === "add"
                            ? setForm({ ...form, email: e.target.value })
                            : setEditForm({
                                ...editForm,
                                email: e.target.value,
                              })
                        }
                        className="w-full px-5 py-3 bg-[#F2F3F4] rounded-md border border-[#F2F2F2] focus:outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#AEACAC52] text-[#353535] text-[14px] font-medium transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[16px] font-medium font-gantari text-[#000000] mb-2">
                        Password{" "}
                        {activeView === "edit" && !isVpmRoute
                          ? "(Leave blank to keep current)"
                          : ""}
                        {activeView === "edit" && isVpmRoute ? (
                          <span className="text-red-500"> *</span>
                        ) : null}
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        placeholder-class="text-[#353535] text-[14px] font-medium font-gantari"
                        value={
                          activeView === "edit" && isVpmRoute
                            ? "********"
                            : activeView === "add"
                            ? form.password
                            : editForm.password
                        }
                        onChange={(e) => {
                          if (activeView === "edit" && isVpmRoute) return;
                          activeView === "add"
                            ? setForm({ ...form, password: e.target.value })
                            : setEditForm({
                                ...editForm,
                                password: e.target.value,
                              });
                        }}
                        className="w-full px-5 py-3 bg-[#F2F3F4] rounded-md border border-[#F2F2F2] focus:outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#AEACAC52] text-[#353535] text-[14px] font-medium transition-all"
                        required={activeView === "add"}
                        disabled={activeView === "edit" && isVpmRoute}
                      />
                      {activeView === "edit" && isVpmRoute ? (
                        <p className="mt-2 text-[13px] text-[#6B7280] font-gantari">
                          Password is encrypted and cannot be viewed or edited
                          here
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-6 ">
                    <div>
                      <label className="block text-[16px] font-medium font-gantari text-[#000000] mb-2">
                        Role
                      </label>
                      <CustomDropdown
                        options={
                          roleOptions.length
                            ? roleOptions
                            : ROLE_OPTIONS_FALLBACK
                        }
                        value={
                          activeView === "add"
                            ? form.user_role
                            : editForm.user_role
                        }
                        onChange={(v) =>
                          activeView === "add"
                            ? setForm({ ...form, user_role: v })
                            : setEditForm({ ...editForm, user_role: v })
                        }
                        placeholder="Select Role"
                        placeholder-class="text-[#353535] text-[14px] font-medium font-gantari"
                      />
                    </div>
                    <div>
                      <label className="block text-[16px] font-medium font-gantari text-[#000000] mb-2">
                        Department
                      </label>
                      <CustomDropdown
                        options={
                          departmentOptions.length
                            ? departmentOptions
                            : [
                                "Production",
                                "Technical",
                                "Quality",
                                "Management",
                              ]
                        }
                        value={
                          activeView === "add"
                            ? form.department
                            : editForm.department
                        }
                        onChange={(v) =>
                          activeView === "add"
                            ? setForm({ ...form, department: v })
                            : setEditForm({ ...editForm, department: v })
                        }
                        placeholder="Select Department"
                        placeholder-class="text-[#353535] text-[14px] font-medium font-gantari"
                      />
                    </div>
                    <div>
                      <label className="block text-[16px] font-medium font-gantari text-[#000000] mb-2">
                        Phone
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={
                            activeView === "add" ? countryCode : editCountryCode
                          }
                          onChange={(e) =>
                            activeView === "add"
                              ? setCountryCode(e.target.value)
                              : setEditCountryCode(e.target.value)
                          }
                          className="w-full sm:w-[75px] px-3 py-3 bg-[#F2F3F4] rounded-md border border-[#F2F2F2] focus:outline-none focus:ring-1 focus:ring-[#AEACAC52] text-[#353535] text-[14px] font-medium appearance-none bg-[url('https://api.iconify.design/heroicons:chevron-down-20-solid.svg')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="1234567890"
                          placeholder-class="text-[#353535] text-[14px] font-medium font-gantari"
                          value={
                            activeView === "add"
                              ? form.phone_number
                              : editForm.phone_number
                          }
                          onChange={(e) =>
                            activeView === "add"
                              ? setForm({
                                  ...form,
                                  phone_number: e.target.value,
                                })
                              : setEditForm({
                                  ...editForm,
                                  phone_number: e.target.value,
                                })
                          }
                          className="flex-1 px-5 py-3 bg-[#F2F3F4] rounded-md border border-[#F2F2F2] focus:outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#AEACAC52] text-[#353535] text-[14px] font-medium transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-full">
                    <label className="block text-[16px] font-medium font-gantari text-[#000000] mb-2">
                      Address
                    </label>
                    <textarea
                      rows={3}
                      value={
                        activeView === "add" ? form.address : editForm.address
                      }
                      onChange={(e) =>
                        activeView === "add"
                          ? setForm({ ...form, address: e.target.value })
                          : setEditForm({
                              ...editForm,
                              address: e.target.value,
                            })
                      }
                      className="w-full px-5 py-3 bg-[#F2F3F4] rounded-md border border-[#F2F2F2] focus:outline-none focus:border-[#F2F2F2] focus:ring-1 focus:ring-[#AEACAC52] text-[#353535] text-[14px] font-medium transition-all resize-none"
                      placeholder="Residential or Office Address"
                      placeholder-class="text-[#353535] text-[14px] font-medium"
                    ></textarea>
                  </div>
                  <div className="col-span-full">
                    <label className="block text-[16px] font-medium font-gantari text-[#000000] mb-2">
                      Profile Picture
                    </label>
                    <div className="flex bg-[#F4F4F4] rounded-lg overflow-hidden border border-transparent focus-within:border-[#DD4342]/30 transition-all flex-col sm:flex-row">
                      <div className="flex-1 px-4 py-3 text-sm text-[#717171] truncate">
                        {(activeView === "add"
                          ? form.profile_picture
                          : editForm.profile_picture
                        )?.name || "Choose JPG/JPEG Image"}
                      </div>
                      <label className="px-6 py-3 bg-[#EAEAEA] text-[#353535] text-[14px] font-medium transition-all cursor-pointer text-center">
                        Browse
                        <input
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg"
                          onChange={(e) =>
                            activeView === "add"
                              ? setForm({
                                  ...form,
                                  profile_picture: e.target.files?.[0] || null,
                                })
                              : setEditForm({
                                  ...editForm,
                                  profile_picture: e.target.files?.[0] || null,
                                })
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 justify-center pt-10 border-t border-[#F0F0F0]">
                  <button
                    type="button"
                    onClick={() => setActiveView("list")}
                    className="px-5 py-2 bg-[#F2F2F2] text-[#353535] text-[14px] font-medium rounded-md cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addSubmitting || editSubmitting}
                    className="px-5 py-2 bg-[#DBE9FE] text-[#353535] text-[14px] font-medium rounded-md cursor-pointer"
                  >
                    {activeView === "add"
                      ? addSubmitting
                        ? "Adding..."
                        : "Save Worker"
                      : editSubmitting
                        ? "Saving..."
                        : "Update Details"}
                  </button>
                </div>
              </form>
            ) : activeView === "invite" ? (
              inviteShowSuccess ? (
                <div
                  className="flex flex-col items-center justify-center text-center px-6 py-16 sm:py-24 max-w-lg mx-auto"
                  role="status"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#E8F8EE] flex items-center justify-center mb-8">
                    <svg
                      className="w-10 h-10 sm:w-12 sm:h-12 text-[#22C55E]"
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
                  </div>
                  <h2 className="text-[22px] sm:text-[26px] font-gantari font-bold text-[#000000] mb-4">
                    Invitations sent successfully
                  </h2>
                  <p className="text-[15px] sm:text-[16px] font-gantari font-medium text-[#353535] leading-relaxed mb-10">
                    Your invitations have been submitted. Invited users will
                    receive an email with next steps.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setInviteShowSuccess(false);
                        setActiveView("list");
                      }}
                      className="px-8 py-3 rounded-xl bg-[#F2F2F2] text-[#353535] text-[15px] font-gantari font-semibold hover:bg-[#E8E8E8] transition-colors"
                    >
                      Back to Resources
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteShowSuccess(false)}
                      className="px-8 py-3 rounded-xl bg-[#DBE9FE] text-[#353535] text-[15px] font-gantari font-semibold hover:bg-[#C5DDF9] transition-colors"
                    >
                      Send more invitations
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="space-y-10">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[16px] font-medium text-[#353535] mb-2">
                        Email Addresses
                      </label>
                      <textarea
                        value={inviteEmails}
                        onChange={(e) => setInviteEmails(e.target.value)}
                        rows={5}
                        className="w-full px-5 py-4 bg-[#F2F3F4] rounded-md border-none outline-none text-sm leading-relaxed"
                        placeholder="email1@example.com, email2@example.com"
                        placeholder-class="text-[#353535] text-[14px] font-medium"
                      ></textarea>
                      <p className="text-[14px] text-[#353535] mt-2 italic px-1">
                        * Separate multiple emails with commas.
                      </p>
                    </div>
                    <div>
                      <label className="block text-[16px] font-medium text-[#353535] mb-2">
                        Message (Optional)
                      </label>
                      <textarea
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        rows={3}
                        className="w-full px-5 py-4 bg-[#F2F3F4] rounded-md border-none outline-none text-sm leading-relaxed"
                        placeholder="Welcome to our team!"
                        placeholder-class="text-[#353535] text-[14px] font-medium"
                      ></textarea>
                    </div>
                  </div>
                  <div className="flex justify-center pt-4">
                    <button
                      type="submit"
                      disabled={inviteSubmitting}
                      className="px-5 py-2 bg-[#DBE9FE] text-[#353535] text-[14px] font-medium rounded-md cursor-pointer"
                    >
                      {inviteSubmitting ? "Sending..." : "Send Invitations"}
                    </button>
                  </div>
                </form>
              )
            ) : activeView === "inactive" ? (
              <div className="space-y-8">
                <div className="p-4 bg-[#F2F3F4] border border-[#F0F0F0] rounded-md">
                  <p className="text-[14px] text-[#353535] leading-relaxed">
                    Select workers to mark as inactive. Inactive workers will no
                    longer appear in project assignment lists or dropdowns.
                  </p>
                </div>
                <div className="border border-[#F0F0F0] rounded-md overflow-hidden divide-y divide-[#F0F0F0]">
                  {list.length ? (
                    list.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex justify-between items-center p-4 hover:bg-[#F9F9F9] transition-colors"
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
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${inactiveIds.includes(emp.id) ? "bg-[#DD4342] border-[#DD4342]" : "bg-white border-slate-200"}`}
                          >
                            {inactiveIds.includes(emp.id) && (
                              <FiX className="text-white w-4 h-4" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span
                              className={`text-[14px] font-medium ${emp.active !== "active" ? "text-slate-400" : "text-[#353535]"}`}
                            >
                              {emp.full_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                              {emp.empid || "No ID"}
                            </span>
                          </div>
                        </div>
                        {emp.active !== "active" && (
                          <span className="text-[10px] font-medium text-red-500 uppercase px-2 py-0.5 bg-red-50 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-[#353535] font-medium">
                      No workers found.
                    </div>
                  )}
                </div>
                <div className="flex gap-4 justify-center pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("list");
                      setInactiveIds([]);
                    }}
                    className="px-5 py-2 bg-[#F2F2F2] text-[#353535] font-medium rounded-md text-[14px] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInactive}
                    disabled={!inactiveIds.length || inactiveSubmitting}
                    className="px-5 py-2 bg-[#DBE9FE] text-[#353535] font-medium rounded-md text-[14px] cursor-pointer"
                  >
                    {inactiveSubmitting ? "Updating..." : "Update Status"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
