import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import type { Vendor } from './PartnerView/types';
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
    return str.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};

function CustomDropdown({
    options,
    value,
    onChange,
    placeholder,
    className = "",
    styleType = "form",
    menuMaxHeightClass = "max-h-[220px]",
    direction = "down",
}: {
    options: string[];
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    className?: string;
    styleType?: "form" | "header" | "table";
    /** Max height for header/form menu list (scroll when content exceeds), e.g. ~4 rows */
    menuMaxHeightClass?: string;
    /** Direction to open the dropdown menu */
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

    // Determine if we should show placeholder color or prefix
    const isPlaceholder = !value || value === placeholder;

    const menuContent = (
        <div
            ref={menuRef}
            className={`fixed z-[9999] bg-[#FFFFFF] border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] overflow-hidden`}
            style={{
                width: coords.width,
                left: coords.left,
                ...(direction === "up"
                    ? { bottom: coords.bottom + 4 }
                    : { top: coords.top + 4 }
                ),
            }}
        >
            <div className={`${menuMaxHeightClass} overflow-y-auto custom-scrollbar`}>
                {(styleType === "header" || styleType === "form") && (
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
                        {`All ${placeholder}`}
                    </button>
                )}
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
                                ? 'text-[#353535] bg-[#F2F2F2]'
                                : 'text-[#8B8B8B] bg-transparent hover:text-[#353535] hover:bg-[#F2F2F2]'
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
            <input
                type="text"
                value={value && value !== placeholder ? value : ""}
                required
                className="absolute opacity-0 pointer-events-none"
                tabIndex={-1}
                readOnly
            />
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[36px] min-h-[36px] flex items-center justify-between gap-2 transition-all outline-none font-gantari min-w-0 ${styleType === "header"
                    ? "px-3 py-2 bg-[#E8E8E8] rounded-md text-[12px] sm:text-[14px] font-semibold"
                    : `px-4 py-2 bg-[#F2F3F4] rounded-md text-[12px] sm:text-[14px] border border-transparent focus:outline-none focus:border-[#AEACAC52] ${isOpen ? "!border-[#AEACAC52]" : ""}`
                    }`}
            >
                <span className={`min-w-0 flex-1 truncate overflow-hidden text-left ${styleType === "header" || styleType === "form"
                    ? (isPlaceholder ? "text-[#8B8B8B]" : "text-[#353535]")
                    : ""
                    }`}>
                    {styleType === "header" && value && !isPlaceholder ? (
                        <span className="font-semibold">{toCamelCase(value)}</span>
                    ) : (
                        value || placeholder
                    )}
                </span>
                <img
                    src={ArrowDown}
                    alt="arrow"
                    className={`w-3 h-3 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''} ${isPlaceholder ? "opacity-60 grayscale" : "opacity-90"}`}
                />
            </button>
            {isOpen && createPortal(menuContent, document.body)}
        </div>
    );
}




export default function PartnerTD() {
    const [allList, setAllList] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const [selectedVendor, setSelectedVendor] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('');

    useEffect(() => {
        const styleTag = document.createElement('style');
        styleTag.textContent = SCROLLBAR_STYLE;
        document.head.appendChild(styleTag);
        return () => { document.head.removeChild(styleTag); };
    }, []);

    useEffect(() => {
        // Fetch all vendors (no status filter) so we can switch tabs without refetching
        api.get<{ vendors?: Vendor[] } | Vendor[]>('/api/vendors')
            .then(({ data }) => {
                const vendors = Array.isArray(data) ? data : (data as { vendors?: Vendor[] }).vendors ?? [];
                setAllList(vendors);
            })
            .catch(() => setAllList([]))
            .finally(() => setLoading(false));
    }, []);

    const displayName = (v: Vendor) => v.company_name || v.partner_name || '-';

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E14B4B]" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full lg:overflow-hidden overflow-visible">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0 mb-6 px-1">
                <div>
                    <h2 className="text-[24px] md:text-[28px] font-semibold text-[#000000] font-Gantari">Partners</h2>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 min-w-0">
                    <div className="flex items-center justify-end gap-2 shrink-0">
                        <CustomDropdown
                            options={Array.from(new Set(allList.map(v => v.contact_name).filter(Boolean).sort())) as string[]}
                            value={selectedVendor}
                            onChange={(val) => setSelectedVendor(val)}
                            placeholder="Vendor Name"
                            className="w-[140px] sm:w-[160px]"
                            styleType="header"
                        />
                        <CustomDropdown
                            options={Array.from(new Set(allList.map(v => v.company_name).filter(Boolean).sort())) as string[]}
                            value={selectedCompany}
                            onChange={(val) => setSelectedCompany(val)}
                            placeholder="Company Name"
                            className="w-[140px] sm:w-[160px]"
                            styleType="header"
                        />
                    </div>
                </div>
            </div>

            {/* Grid — fills remaining height; scrolling happens inside the flex container */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-4">
                    {(() => {
                        const searchQuery = searchParams.get('q')?.toLowerCase() || "";
                        const filteredList = allList.filter(v => {
                            const matchesSearch = !searchQuery ||
                                (v.company_name || "").toLowerCase().includes(searchQuery) ||
                                (v.partner_name || "").toLowerCase().includes(searchQuery) ||
                                (v.contact_name || "").toLowerCase().includes(searchQuery) ||
                                (v.contact_email || "").toLowerCase().includes(searchQuery);

                            if (!matchesSearch) return false;

                            if (selectedVendor && v.contact_name !== selectedVendor) return false;
                            if (selectedCompany && v.company_name !== selectedCompany) return false;

                            return true;
                        });

                        if (filteredList.length === 0) {
                            return (
                                <div className="col-span-full bg-slate-50/50 backdrop-blur-sm rounded-[20px] p-12 text-center text-slate-500 border border-slate-100">
                                    No partners found.
                                </div>
                            );
                        }

                        return filteredList.map((partner) => (
                            <div
                                key={partner.id}
                                className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#E8E8E8] overflow-hidden flex flex-col hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300"
                            >
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className="text-[20px] font-medium text-[#000000] font-Gantari leading-tight line-clamp-2 mb-4">
                                        {displayName(partner)}
                                    </h3>

                                    <p className="text-[14px] font-Gantari font-medium text-[#616161] mb-1">
                                        Vendor Name
                                    </p>
                                    <p className="text-[14px] font-medium text-[#000000] font-Gantari leading-snug">
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
                                        <Link
                                            to={`/td/partner/${partner.id}`}
                                            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B8B8B] hover:text-[#353535] transition-colors shrink-0 pr-2"
                                        >
                                            Details
                                            <img 
                                                src={upArrow} 
                                                alt="Up" 
                                                className="w-5 h-5 object-contain transition-all duration-200 brightness-0 invert-[54%] group-hover:invert-[21%]" 
                                            />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            </div>
        </div>
    );
}
