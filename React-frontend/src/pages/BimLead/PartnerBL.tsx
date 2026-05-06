import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';
import type { Vendor } from '../TechnicalDirector/PartnerView/types';
import upArrow from '../../assets/TechnicalDirector/upArrow.svg';
import ArrowDown from '../../assets/TechnicalDirector/ep_arrow-down-bold.svg';

const SCROLLBAR_STYLE = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
    height: 4px;
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

const toCamelCase = (str: string): string => {
    if (!str) return str;
    return str
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

function CustomDropdown({
    options,
    value,
    onChange,
    placeholder,
    className = "",
    styleType = "form",
    alignMenu = "right",
    menuMaxHeightClass = "max-h-[220px]",
    direction = "down",
}: {
    options: string[];
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    className?: string;
    styleType?: "form" | "header" | "table";
    alignMenu?: "left" | "right";
    menuMaxHeightClass?: string;
    direction?: "up" | "down";
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, bottom: 0 });

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            const isInsideTrigger = dropdownRef.current && dropdownRef.current.contains(target);
            const isInsideMenu = menuRef.current && menuRef.current.contains(target);

            if (!isInsideTrigger && !isInsideMenu) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            const updatePosition = () => {
                if (dropdownRef.current) {
                    const rect = dropdownRef.current.getBoundingClientRect();
                    setCoords({
                        top: rect.bottom,
                        left: rect.left,
                        width: rect.width,
                        bottom: window.innerHeight - rect.top,
                    });
                }
            };

            updatePosition();
            window.addEventListener("scroll", updatePosition, true);
            window.addEventListener("resize", updatePosition);

            return () => {
                window.removeEventListener("scroll", updatePosition, true);
                window.removeEventListener("resize", updatePosition);
            };
        }
    }, [isOpen]);

    const isPlaceholder = !value || value === placeholder;

    const menuContent = (
        <div
            ref={menuRef}
            className={`fixed z-[9999] bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] overflow-hidden`}
            style={{
                width: coords.width,
                left: alignMenu === "right" ? coords.left : coords.left,
                ...(direction === "up"
                    ? { bottom: coords.bottom + 4 }
                    : { top: coords.top + 4 }
                ),
            }}
        >
            <div className={`${menuMaxHeightClass} overflow-y-auto custom-scrollbar`}>
                <button
                    type="button"
                    onClick={() => {
                        onChange("");
                        setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-[14px] transition-colors font-gantari cursor-pointer hover:text-[#353535] hover:bg-[#F2F2F2] ${isPlaceholder
                        ? "text-[#353535] bg-[#F2F2F2]"
                        : "text-[#8B8B8B] bg-[#FFFFFF]"
                        }`}
                >
                    All {placeholder}
                </button>
                {options.map((option) => {
                    const isChosen = value === option;
                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => {
                                onChange(option);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-gantari font-normal transition-colors cursor-pointer ${isChosen
                                ? "text-[#353535] bg-[#F2F2F2]"
                                : "text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]"
                                }`}
                        >
                            <span className="truncate min-w-0">{option}</span>
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
    );

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[36px] min-h-[36px] flex items-center justify-between gap-2 transition-all outline-none font-gantari min-w-0 cursor-pointer ${styleType === "header"
                    ? "px-3 py-2 bg-[#E8E8E8] rounded-md text-[12px] sm:text-[14px] font-semibold"
                    : `px-4 py-2 bg-[#F2F3F4] rounded-md text-[12px] sm:text-[14px] border border-transparent focus:outline-none focus:border-[#AEACAC52] ${isOpen ? "!border-[#AEACAC52]" : ""}`
                    }`}
            >
                <span
                    className={`min-w-0 flex-1 truncate overflow-hidden text-left ${isPlaceholder ? "text-[#8B8B8B]" : "text-[#353535]"}`}
                >
                    {value && !isPlaceholder ? (
                        <span className="font-semibold">{toCamelCase(value)}</span>
                    ) : (
                        placeholder
                    )}
                </span>
                <img
                    src={ArrowDown}
                    alt=""
                    className={`w-3 h-3 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""} ${isPlaceholder ? "opacity-60 grayscale" : "opacity-90"}`}
                    aria-hidden
                />
            </button>
            {isOpen && createPortal(menuContent, document.body)}
        </div>
    );
}

export default function PartnerBL() {
    const navigate = useNavigate();
    const [list, setList] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVendor, setSelectedVendor] = useState("");
    const [selectedCompany, setSelectedCompany] = useState("");

    useEffect(() => {
        const styleTag = document.createElement("style");
        styleTag.textContent = SCROLLBAR_STYLE;
        document.head.appendChild(styleTag);
        return () => {
            document.head.removeChild(styleTag);
        };
    }, []);

    useEffect(() => {
        api.get<{ vendors?: Vendor[] } | Vendor[]>("/api/vendors?status=approved")
            .then(({ data }) => {
                const vendors = Array.isArray(data)
                    ? data
                    : (data as { vendors?: Vendor[] }).vendors ?? [];
                setList(vendors);
            })
            .catch(() => setList([]))
            .finally(() => setLoading(false));
    }, []);

    const [searchParams] = useSearchParams();

    const vendorOptions = useMemo(() => {
        const names = list.map(v => v.contact_name).filter(Boolean) as string[];
        return Array.from(new Set(names)).sort();
    }, [list]);

    const companyOptions = useMemo(() => {
        const names = list.map(v => v.company_name).filter(Boolean) as string[];
        return Array.from(new Set(names)).sort();
    }, [list]);

    const filteredList = useMemo(() => {
        const q = searchParams.get("q")?.toLowerCase() || "";
        return list.filter((v) => {
            const matchesSearch = !q || [
                v.company_name,
                v.partner_name,
                v.contact_name,
                v.contact_email,
            ].some((f) => (f || "").toLowerCase().includes(q));

            const matchesVendor = !selectedVendor || v.contact_name === selectedVendor;
            const matchesCompany = !selectedCompany || v.company_name === selectedCompany;

            return matchesSearch && matchesVendor && matchesCompany;
        });
    }, [list, searchParams, selectedVendor, selectedCompany]);

    const displayName = (v: Vendor) => v.company_name || v.partner_name || "-";

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E14B4B]" />
            </div>
        );
    }

    return (
        <div className="h-full min-h-0 flex flex-col flex-1 -mb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 mb-4">
                <div>
                    <h2 className="text-[24px] font-semibold text-[#12141D] font-Gantari">Partners</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 ml-auto">
                    <CustomDropdown
                        options={vendorOptions}
                        value={selectedVendor}
                        onChange={setSelectedVendor}
                        placeholder="Vendor Name"
                        styleType="header"
                        className="w-[180px]"
                    />
                    <CustomDropdown
                        options={companyOptions}
                        value={selectedCompany}
                        onChange={setSelectedCompany}
                        placeholder="Company Name"
                        styleType="header"
                        className="w-[180px]"
                    />
                </div>
            </div>

            {/* Grid — fills remaining height; no extra bottom padding */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredList.length === 0 ? (
                        <div className="col-span-full bg-white/50 backdrop-blur-sm rounded-[20px] p-12 text-center text-slate-500 border border-white/40">
                            No partners found.
                        </div>
                    ) : (
                        filteredList.map((partner) => (
                            <div
                                key={partner.id}
                                className="bg-white rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#E8E8E8] overflow-hidden flex flex-col hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300"
                            >
                                <div className="px-6 py-4 flex-1 flex flex-col">
                                    <h3 className="text-[20px] font-medium text-[#000000] font-Gantari leading-tight line-clamp-2 mb-4">
                                        {displayName(partner)}
                                    </h3>

                                    <p className="text-[14px] font-Gantari font-medium text-[#9E9E9E] ">
                                        Vendor Name
                                    </p>
                                    <p className="text-[16px] font-medium text-[#000000] font-Gantari leading-snug">
                                        {partner.contact_name || '—'}
                                    </p>
                                    <p className="text-[14px] text-[#353535] font-Gantari mt-3 truncate" title={partner.contact_email || undefined}>
                                        {partner.contact_email || '—'}
                                    </p>

                                    <div className="my-5 border-t border-[#E5E5E5]" />

                                    <div className="flex items-center justify-between gap-3 mt-auto">
                                        <span className="text-[14px] font-Gantari font-medium text-[#757575]">
                                            {partner.num_employees
                                                ? `${partner.num_employees}+ Employees`
                                                : '—'}
                                        </span>
                                        <div className="relative group">
                                            <Link
                                                to={`/bl/partner/${partner.id}`}
                                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B8B8B] hover:text-[#353535] transition-colors shrink-0 pr-2 cursor-pointer"
                                            >
                                                Details
                                                <img src={upArrow} alt="Up" className="w-5 h-5 object-contain" />
                                            </Link>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
