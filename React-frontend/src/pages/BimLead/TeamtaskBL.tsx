import { useEffect, useState, useRef, useMemo } from "react";
import {
    Link,
    useSearchParams,
    useLocation,
    useNavigate,
} from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg"
import editIcon from "../../assets/ProjectManager/project/editIcon.svg"
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg"
import Group1 from "../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../assets/ProjectManager/MyTask/Group3.svg";
import Arrow from "../../assets/ProjectManager/MyTask/arrow.svg";
import Dot from "../../assets/ProjectManager/MyTask/Dot.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import AddBtn from "../../assets/TechnicalDirector/add btn.svg";
import { TimePickerWheel } from "../../components/TimePickerWheel";
import { AttachmentPreviewModal } from "../../components/AttachmentPreviewModal";
import { isEmployeeActiveForProjectAssignment } from "../../utils/employeeActive";

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || "";
const getProfileUrl = (path: string | undefined): string => {
    if (!path || path.trim() === "") return "";
    if (path.startsWith("http")) return path;
    const normalizedPath = path.replace(/\\/g, "/").trim().replace(/^\d+\s+/, "").replace(/^\/+/, "");
    const apiBaseUrl = getApiBaseUrl();
    let urlPath = "";
    if (normalizedPath.startsWith("employee/")) {
        const parts = normalizedPath.split("/");
        const encodedParts = parts.map((part, index) => index === 0 ? part : encodeURIComponent(part));
        urlPath = `/uploads/${encodedParts.join("/")}`;
    } else if (normalizedPath.startsWith("profiles/")) {
        const filename = normalizedPath.replace("profiles/", "");
        urlPath = `/uploads/employee/${encodeURIComponent(filename)}`;
    } else if (!normalizedPath.includes("/")) {
        urlPath = `/uploads/employee/${encodeURIComponent(normalizedPath)}`;
    } else {
        const parts = normalizedPath.split("/");
        const encodedParts = parts.map((part, index) => index === 0 ? part : encodeURIComponent(part));
        urlPath = `/uploads/${encodedParts.join("/")}`;
    }
    return `${apiBaseUrl}${urlPath}`;
};

function formatTimeForDisplay(value: string): string {
    if (!value || !value.match(/^\d{1,2}:\d{2}$/)) return "--:--";
    const [hStr, mStr] = value.split(":");
    const h24 = parseInt(hStr, 10);
    const m = mStr || "00";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const ampm = h24 < 12 ? "AM" : "PM";
    return `${h12}:${m} ${ampm}`;
}

type DropdownId = "employee" | "projects" | "show" | "period" | null;
type FormDropdownId = "project" | "module" | "type" | "assignTo" | "type_start_time" | "type_end_time" | null;

interface FormDropdownProps {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    dropdownRef: React.RefObject<HTMLDivElement | null>;
    searchable?: boolean;
}

function FormDropdown({
    label,
    options,
    value,
    onChange,
    isOpen,
    onToggle,
    onClose,
    triggerRef,
    dropdownRef,
    searchable = false,
}: FormDropdownProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const q = searchQuery.trim().toLowerCase();
    const filteredOptions = searchable && q
        ? options.filter((opt) =>
            opt.label.toLowerCase().includes(q) ||
            String(opt.value).toLowerCase().includes(q)
        )
        : options;

    const displayLabel = value
        ? (options.find((o) => o.value === value)?.label ?? value)
        : label;
    return (
        <div className="relative w-full">
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className="flex w-full items-center justify-between rounded-sm bg-[#E8E8E8] px-3 py-2 text-left text-sm cursor-pointer"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={label}
            >
                <span className={value ? "text-[#353535]" : "text-[#616161]"}>
                    {displayLabel}
                </span>
                <img
                    src={ArrowDown}
                    alt="arrow"
                    className={`ml-2 h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>
            {isOpen && (
                <div
                    ref={dropdownRef}
                    role="listbox"
                    className="absolute top-full left-0 z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                >
                    {searchable && (
                        <div className="px-2 pb-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-800 placeholder-slate-400"
                                placeholder="Search..."
                            />
                        </div>
                    )}
                    <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                        {filteredOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                role="option"
                                onClick={() => {
                                    onChange(opt.value);
                                    onClose();
                                }}
                                className="block w-full px-3 py-2 text-left text-sm text-[#616161] hover:text-[#353535] hover:bg-slate-100 first:rounded-t-lg last:rounded-b-lg cursor-pointer"
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface TaskDropdownProps {
    label: string;
    options: string[];
    selected: string | null;
    onSelect: (value: string) => void;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    dropdownRef: React.RefObject<HTMLDivElement | null>;
    narrow?: boolean;
    searchable?: boolean;
    searchPlaceholder?: string;
    maxVisibleItems?: number;
}

function TaskDropdown({
    label,
    options,
    selected,
    onSelect,
    isOpen,
    onToggle,
    onClose,
    triggerRef,
    dropdownRef,
    narrow = false,
    searchable = false,
    searchPlaceholder = "Search...",
    maxVisibleItems = 5,
}: TaskDropdownProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const q = (searchQuery || "").trim().toLowerCase();
    const filteredOptions = searchable
        ? (() => {
            if (!q) return options;
            const first = options[0];
            const isPlaceholderOption = (o: string) =>
                o === first && (first === "Select Employee" || first === "Select Projects");
            return options.filter((opt) => {
                if (isPlaceholderOption(opt)) return false; // hide placeholder when searching
                const name = String(opt ?? "").trim().toLowerCase();
                return name.includes(q);
            });
        })()
        : options;
    const listMaxHeight = `${maxVisibleItems * 40}px`

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={`inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-3 sm:px-4 py-2 text-[14px] font-semibold font-Gantari cursor-pointer w-full transition-colors hover:bg-[#dfdfdf] ${narrow ? (label === "Period" ? "lg:min-w-[100px]" : "lg:min-w-[150px]") : "lg:min-w-[160px]"}`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={label}
            >
                <span className={`truncate font-Gantari ${selected && selected !== label ? "text-[#353535]" : "text-[#8B8B8B]"}`}>
                    {(label.toLowerCase() === "show entries" || label.toLowerCase() === "show ") && selected && selected !== label ? (
                        <>
                            <span className="text-[14px]">Show:</span>{" "}
                            <span className="font-semibold">{selected}</span>
                        </>
                    ) : (
                        selected ?? label
                    )}
                </span>
                <img
                    src={ArrowDown}
                    alt="arrow"
                    className={`ml-2 w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>
            {isOpen && (
                <div
                    ref={dropdownRef}
                    role="listbox"
                    className={`absolute top-full z-[100] mt-1 rounded-lg border border-gray-200 bg-white shadow-lg ${narrow ? "right-0 min-w-[110px]" : "left-0 min-w-[160px]"}`}
                >
                    {searchable && (
                        <div className="sticky top-0 border-b border-slate-200 bg-white p-2 rounded-t-lg">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder={searchPlaceholder}
                                className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400"
                                aria-label={searchPlaceholder}
                            />
                        </div>
                    )}
                    <div
                        className="overflow-y-auto py-1 custom-scrollbar"
                        style={{ maxHeight: listMaxHeight }}
                    >
                        {filteredOptions.map((opt, idx) => (
                            <button
                                key={`${opt}-${idx}`}
                                type="button"
                                role="option"
                                onClick={() => {
                                    if (searchable) setSearchQuery("");
                                    onSelect(opt);
                                    onClose();
                                }}
                                className={`block w-full px-4 py-2 text-left text-[14px] font-Gantari transition-colors cursor-pointer ${selected === opt ? "bg-[#F2F2F2] text-[#353535] font-semibold" : "text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]"}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function AttachmentPreviewItem({
    file,
    onRemove,
    onPreviewClick,
}: {
    file: File;
    onRemove: () => void;
    onPreviewClick?: (file: File) => void;
}) {
    const isImage = file.type.startsWith("image/");
    const [previewUrl] = useState<string | null>(() =>
        isImage ? URL.createObjectURL(file) : null
    );
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);
    return (
        <li className="flex items-center gap-3 rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-[#101827]">
            <button
                type="button"
                onClick={() => onPreviewClick?.(file)}
                className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-90 cursor-pointer"
            >
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded object-cover border border-slate-200 cursor-pointer"
                    />
                ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 text-slate-500 cursor-pointer">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <span className="truncate block" title={file.name}>{file.name}</span>
                    <span className="text-xs text-[#8B8B8B]">{formatFileSize(file.size)}</span>
                </div>
            </button>
            <button
                type="button"
                onClick={onRemove}
                className="shrink-0 p-0.5 rounded text-black hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                aria-label={`Remove ${file.name}`}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </li>
    );
}

interface Task {
    id: number;
    task_name?: string;
    status?: string;
    due_date?: string;
    project_name?: string;
    start_date?: string;
    progress?: number;
    module?: string;
    type?: string;
    start_time?: string;
    due_time?: string;
    assign_to?: string;
    description?: string;
    checklist?: string;
    assigned_full_name?: string;
    uploader_full_name?: string;
    assigned_to?: number;
    uploaderid?: number;
    assigned_profile_picture?: string;
    uploader_profile_picture?: string;
    Approval?: string;
    created_at?: string;
    Actual_start_time?: string;
    projectid?: number;
    source?: "In House" | "Outsource";
}

interface Employee {
    id: number;
    full_name: string;
    active?: string | null;
}

interface Project {
    id: number;
    project_name: string;
    modules?: string;
    tasks?: string;
    members?: string;
    members_names?: string[];
    project_manager_name?: string | null;
    lead_name?: string | null;
    bim_coordinator_name?: string | null;
    uploader_name?: string | null;
    source?: "In House" | "Outsource";
}

/** Map task (local or API shape) to form values so every detail shows in edit. */

function normalizeStatus(
    s: string | undefined,
    approval?: string
): "todo" | "in_progress" | "completed" {
    if (approval?.toLowerCase() === "approved") return "completed";
    if (approval?.toLowerCase() === "rejected") return "todo";
    if (!s) return "todo";
    const lower = s.toLowerCase().replace(/\s+/g, "_");
    if (lower.includes("progress") || lower === "in_progress")
        return "in_progress";
    if (lower.includes("complete") || lower === "done") return "completed";
    return "todo";
}

function TaskCard({
    task,
    status,
    onViewTask,
    onEditTask,
    onDeleteTask,
}: {
    task: Task;
    status: "todo" | "in_progress" | "completed";
    onViewTask?: (task: Task) => void;
    onEditTask?: (task: Task) => void;
    onDeleteTask?: (task: Task) => void;
}) {
    const progress = typeof task.progress === "number" ? task.progress : status === "todo" ? 0 : status === "in_progress" ? 50 : 100;
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    const handleDragStart = (e: React.DragEvent) => {
        if (status === "completed" || task.source === "Outsource") {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData("taskId", String(task.id));
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.task_name || "Task");
    };

    const isCompleted = status === "completed";

    return (
        <div
            draggable={!isCompleted}
            onDragStart={handleDragStart}
            className={`rounded-md border border-slate-200 bg-white p-2.5 shadow-sm relative ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        >
            <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="flex-1 min-w-0 font-semibold text-[#353535] text-[18px] sm:text-[20px] truncate">
                    {task.task_name || "Task Name"}
                </h4>
                <div className="relative shrink-0" ref={menuRef}>
                    <button
                        type="button"
                        draggable={false}
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((prev) => !prev);
                        }}
                        className="p-1 rounded cursor-pointer leading-none"
                        aria-label="More options"
                        aria-expanded={menuOpen}
                    >
                        <img src={Dot} alt="Dot" className="w-5 h-5 object-contain" />
                    </button>
                    {menuOpen && (
                        <div
                            className={`absolute top-full right-0 mt-1 z-50 min-w-[160px] bg-white/20 backdrop-blur-md rounded-md border border-[#59595980] shadow-xl transition-all duration-200 ease-out origin-top-right
                                ${menuOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}
                            role="menu"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
                                onClick={() => {
                                    setMenuOpen(false);
                                    onViewTask?.(task);
                                }}
                            >
                                <img
                                    src={viewIcon}
                                    alt="view"
                                    className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                />
                                <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                                    View
                                </span>
                            </button>
                            {task.source !== "Outsource" && !isCompleted && (
                                <>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onEditTask?.(task);
                                        }}
                                    >
                                        <img
                                            src={editIcon}
                                            alt="edit"
                                            className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                        />
                                        <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                                            Edit
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group cursor-pointer"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onDeleteTask?.(task);
                                        }}
                                    >
                                        <img
                                            src={deleteIcon}
                                            alt="delete"
                                            className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(180%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                                        />
                                        <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                                            Delete
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex flex-col ">
                    <span className="text-[14px] font-medium text-[#000000]">Start Date</span>
                    <span className="text-[14px] font-medium text-[#8B8B8B]">
                        {(task.start_date || task.Actual_start_time) ? `${new Date(task.start_date || task.Actual_start_time!).getDate().toString().padStart(2, '0')}-${(new Date(task.start_date || task.Actual_start_time!).getMonth() + 1).toString().padStart(2, '0')}-${new Date(task.start_date || task.Actual_start_time!).getFullYear()}` : "—"}
                    </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[14px] font-medium text-[#000000]">End Date</span>
                    <span className="text-[14px] font-medium text-[#8B8B8B]">
                        {task.due_date ? `${new Date(task.due_date).getDate().toString().padStart(2, '0')}-${(new Date(task.due_date).getMonth() + 1).toString().padStart(2, '0')}-${new Date(task.due_date).getFullYear()}` : ""}
                    </span>
                </div>
            </div>
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-[#8B8B8B]">Progress</span>
                <span className="text-xs font-medium text-[#8B8B8B]">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-4">
                <div
                    className="h-full rounded-full bg-[#8B8B8B]"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                    <div className="flex -space-x-2">
                        {/* Assigned To avatar */}
                        {task.assigned_full_name &&
                            (() => {
                                const src =
                                    task.assigned_to != null && task.assigned_profile_picture
                                        ? getGlobalProfileUrl(task.assigned_to, task.assigned_profile_picture)
                                        : task.assigned_profile_picture
                                            ? getProfileUrl(task.assigned_profile_picture)
                                            : "";
                                const initials = task.assigned_full_name
                                    .split(" ")
                                    .filter(Boolean)
                                    .map((p) => p[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase();
                                return (
                                    <div
                                        className="w-7 h-7 rounded-full bg-slate-300 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
                                        title={`Assigned To: ${task.assigned_full_name}`}
                                    >
                                        {src ? (
                                            <img src={src} alt={task.assigned_full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{initials}</span>
                                        )}
                                    </div>
                                );
                            })()}
                        {/* Assigned By avatar */}
                        {task.uploader_full_name &&
                            (() => {
                                const src =
                                    task.uploaderid != null && task.uploader_profile_picture
                                        ? getGlobalProfileUrl(task.uploaderid, task.uploader_profile_picture)
                                        : task.uploader_profile_picture
                                            ? getProfileUrl(task.uploader_profile_picture)
                                            : "";
                                const initials = task.uploader_full_name
                                    .split(" ")
                                    .filter(Boolean)
                                    .map((p) => p[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase();
                                return (
                                    <div
                                        className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
                                        title={`Assigned By: ${task.uploader_full_name}`}
                                    >
                                        {src ? (
                                            <img src={src} alt={task.uploader_full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{initials}</span>
                                        )}
                                    </div>
                                );
                            })()}
                    </div>
                </div>
                <button
                    type="button"
                    draggable={false}
                    onClick={() => onViewTask?.(task)}
                    className="group inline-flex items-center text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] gap-2 cursor-pointer"
                >
                    Details
                    <img
                        src={Arrow}
                        alt="Arrow"
                        className="w-2.5 h-2.5 transition-all duration-200 group-hover:brightness-0 group-hover:invert-[20%]"
                    />
                </button>
            </div>
        </div>
    );
}

const SHOW_OPTIONS = ["Show Entries", "1-50", "51-100", "101-150", "151-200", "201-250", "251-300", "All"];
const PERIOD_OPTIONS = [
    "Period",
    "This Week",
    "This Month",
    "This Quarter",
    "Custom",
];

export default function TeamtaskBL() {
    const [searchParams] = useSearchParams();
    const { pathname } = useLocation();
    const isTeam =
        searchParams.get("condition") === "1" || pathname.endsWith("/teamtasks") || pathname.endsWith("/team");
    const statusFilter =
        searchParams.get("status") || searchParams.get("taskstatus");
    const STORAGE_KEY = "bl_teamTask_localTasks";
    const DELETED_IDS_KEY = "bl_teamTask_deletedIds";

    const loadDeletedIds = (): number[] => {
        try {
            const raw = localStorage.getItem(DELETED_IDS_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed)
                ? parsed.map(Number).filter((n) => !Number.isNaN(n))
                : [];
        } catch {
            return [];
        }
    };

    const [list, setList] = useState<Task[]>([]);
    const [localTasks, setLocalTasks] = useState<Task[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as Task[];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const [deletedIds, setDeletedIds] = useState<number[]>(loadDeletedIds);
    const [loading, setLoading] = useState(true);

    const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<string | null>(
        searchParams.get("project") || null
    );

    useEffect(() => {
        const proj = searchParams.get("project");
        if (proj) setSelectedProject(proj);
    }, [searchParams]);
    const [selectedShow, setSelectedShow] = useState<string | null>("Show");
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [deleteTask, setDeleteTask] = useState<Task | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [modules, setModules] = useState<string[]>([]);

    const isOutsourceProjectSelected = useMemo(() => {
        if (!selectedProject || selectedProject === "Select Projects" || selectedProject === "Show All" || selectedProject === "Projects") return false;
        return projects.find(p => p.project_name === selectedProject)?.source === "Outsource";
    }, [selectedProject, projects]);
    const [addTaskForm, setAddTaskForm] = useState({
        projectName: "",
        module: "",
        taskName: "",
        type: "",
        actualStartDate: "",
        actualEndDate: "",
        startTime: "",
        dueTime: "",
        assignTo: "",
        description: "",
        checklist: "",
    });

    const employeesForAssignDropdown = useMemo(() => {
        const all = Array.isArray(employees) ? employees : [];
        if (!addTaskForm.projectName) return all;
        const proj = projects.find(p => p.project_name === addTaskForm.projectName);
        if (!proj) return all;

        const raw = (proj.members || "").trim();
        if (!raw) return all;
        const tokens = raw.split(",").map((s: string) => s.trim()).filter(Boolean);

        return all.filter(isEmployeeActiveForProjectAssignment).filter((emp) => {
            const name = (emp.full_name || "").trim();
            const idStr = String(emp.id);
            return tokens.some((t: string) => t === idStr || t.toLowerCase() === name.toLowerCase());
        });
    }, [employees, projects, addTaskForm.projectName]);

    const employeeOptions = useMemo(() => {
        const raw = Array.isArray(employees) ? employees : [];
        if (!selectedProject || selectedProject === "Select Projects" || selectedProject === "Show All" || selectedProject === "Projects") {
            return ["Select Employee", "Show All", ...raw.map((e) => e.full_name).filter(Boolean)];
        }
        const proj = projects.find((p) => p.project_name === selectedProject);
        if (!proj) {
            return ["Select Employee", "Show All", ...raw.map((e) => e.full_name).filter(Boolean)];
        }

        const memberTokens = (proj.members || "").split(",").map(s => s.trim()).filter(Boolean);
        const filtered = raw.filter(emp => {
            const name = (emp.full_name || "").trim();
            const idStr = String(emp.id);
            return memberTokens.some(t => t === idStr || t.toLowerCase() === name.toLowerCase());
        });

        return ["Select Employee", "Show All", ...filtered.map(e => e.full_name)];
    }, [employees, projects, selectedProject]);

    const merged = useMemo(() => {
        return [
            ...localTasks,
            ...list.filter((t) => !localTasks.some((l) => l.id === t.id)),
        ];
    }, [localTasks, list]);

    const allTasksBase = useMemo(() => {
        return merged.filter((t) => !deletedIds.includes(t.id));
    }, [merged, deletedIds]);

    const filteredTasks = useMemo(() => {
        const q = searchParams.get("q")?.toLowerCase() || "";

        return allTasksBase.filter((t: any) => {
            // Employee filter
            if (
                selectedEmployee &&
                !["Select Employee", "Show All", "Employee"].includes(
                    selectedEmployee
                )
            ) {
                if (t.assigned_full_name !== selectedEmployee) return false;
            }
            // Project filter
            if (
                selectedProject &&
                !["Select Projects", "Show All", "Projects"].includes(
                    selectedProject
                )
            ) {
                if (t.project_name !== selectedProject) return false;
            }
            // Period filter
            if (
                selectedPeriod &&
                !["Period", "Show All"].includes(selectedPeriod)
            ) {
                const taskDate = new Date(t.created_at || t.start_date || "");
                const now = new Date();
                if (selectedPeriod === "This Week") {
                    const weekAgo = new Date();
                    weekAgo.setDate(now.getDate() - 7);
                    if (taskDate < weekAgo) return false;
                } else if (selectedPeriod === "This Month") {
                    const monthAgo = new Date();
                    monthAgo.setMonth(now.getMonth() - 1);
                    if (taskDate < monthAgo) return false;
                } else if (selectedPeriod === "This Quarter") {
                    const quarterAgo = new Date();
                    quarterAgo.setMonth(now.getMonth() - 3);
                    if (taskDate < quarterAgo) return false;
                }
            }

            // Search filter
            if (q) {
                const matches = [
                    t.task_name,
                    t.project_name,
                    t.module,
                    t.type,
                    t.description,
                    t.assigned_full_name,
                    t.uploader_full_name,
                ].some((f) => (f || "").toLowerCase().includes(q));
                if (!matches) return false;
            }

            return true;
        });
    }, [
        allTasksBase,
        searchParams,
        selectedEmployee,
        selectedProject,
        selectedPeriod,
    ]);

    const allTasks = filteredTasks;

    const counts = {
        todo: allTasks.filter((t) => normalizeStatus(t.status, t.Approval) === "todo").length,
        in_progress: allTasks.filter(
            (t) => normalizeStatus(t.status, t.Approval) === "in_progress",
        ).length,
        completed: allTasks.filter((t) => normalizeStatus(t.status, t.Approval) === "completed")
            .length,
    };

    const tasksByStatus = {
        todo: allTasks.filter((t) => normalizeStatus(t.status, t.Approval) === "todo"),
        in_progress: allTasks.filter(
            (t) => normalizeStatus(t.status, t.Approval) === "in_progress",
        ),
        completed: allTasks.filter(
            (t) => normalizeStatus(t.status, t.Approval) === "completed",
        ),
    };

    const showLimit =
        selectedShow === "All" || !selectedShow || selectedShow === "Show"
            ? Number.POSITIVE_INFINITY
            : Math.max(1, Number(selectedShow) || 10);

    const displayedTasksByStatus = {
        todo: tasksByStatus.todo.slice(0, showLimit),
        in_progress: tasksByStatus.in_progress.slice(0, showLimit),
        completed: tasksByStatus.completed.slice(0, showLimit),
    };

    const statusToLabel = (s: "todo" | "in_progress" | "completed"): string => {
        return s === "todo"
            ? "To Do"
            : s === "in_progress"
                ? "In Progress"
                : "Completed";
    };

    const handleMoveTask = (
        taskId: number,
        newStatus: "todo" | "in_progress" | "completed",
    ) => {
        const label = statusToLabel(newStatus);

        // Find task to get projectId if possible
        const task = merged.find(t => t.id === taskId);
        if (task?.source === "Outsource") {
            console.warn("Bim Lead cannot update status of an Outsource task.");
            return;
        }
        if (task) {
            const current = normalizeStatus(task.status, task.Approval);
            if (current === "todo" && newStatus === "completed") {
                toast.error("Move the task to In Progress before marking it completed.");
                return;
            }
            if (current === "completed" && newStatus !== "completed") {
                toast.error("Completed tasks cannot be moved.");
                return;
            }
        }
        const projectId = task?.projectid || projects.find(p => p.project_name === task?.project_name)?.id;

        // Visual update immediately
        setList((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: label } : t)));
        setLocalTasks((prev) => {
            const idx = prev.findIndex((t) => t.id === taskId);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], status: label };
                return next;
            }
            const fromList = list.find((t) => t.id === taskId);
            if (fromList) return [{ ...fromList, status: label }, ...prev];
            return prev;
        });

        // Backend update
        const isOutsource = task?.source === ("Outsource" as any);
        const endpoint = isOutsource
            ? `/api/vendors/vendor-tasks/${taskId}/status`
            : `/api/tasks/${taskId}/status`;

        api.patch(endpoint, {
            status: newStatus.replace("_", ""), // maps "in_progress" to "inprogress", "todo" to "todo"
            projectId
        }).catch(err => {
            console.error("Failed to update task status:", err);
            // Optionally revert local state on error
        });
    };

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(localTasks));
        } catch {
            // ignore
        }
    }, [localTasks]);

    useEffect(() => {
        try {
            localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(deletedIds));
        } catch {
            // ignore
        }
    }, [deletedIds]);

    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const openEditTask = (task: Task) => {
        navigate("/bl/teamtasks/add", { state: { task, from: "teamtasks" } });
    };

    const openDeleteTask = (task: Task) => {
        setDeleteTask(task);
    };

    const openViewTask = (task: Task) => {
        navigate("/bl/mytasks/view", { state: { task, from: "teamtask" } });
    };

    const confirmDeleteTask = () => {
        if (deleteTask !== null) {
            const isOutsource = deleteTask.source === "Outsource";
            const endpoint = isOutsource
                ? `/api/vendors/vendor-tasks/${deleteTask.id}`
                : `/api/tasks/${deleteTask.id}`;

            api.delete(endpoint).then(() => {
                const params: Record<string, string> = {
                    condition: isTeam ? "1" : "0",
                    employeeid: "all"
                };

                Promise.all([
                    api.get<{ tasks?: Task[] }>("/api/tasks", { params }),
                    api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params })
                ]).then(([res1, res2]) => {
                    const internal = (res1.data.tasks ?? []).map(t => ({ ...t, source: "In House" }));
                    const vendor = (res2.data.tasks ?? []).map(t => ({ ...t, source: "Outsource" }));
                    setList([...internal, ...vendor] as Task[]);
                });

                setLocalTasks((prev) => prev.filter((t) => t.id !== deleteTask.id));
                setDeletedIds((prev) =>
                    prev.includes(deleteTask.id) ? prev : [...prev, deleteTask.id],
                );
            }).finally(() => {
                setDeleteTask(null);
            });
        }
    };

    const resetTaskFormAndClose = () => {
        setAddTaskModalOpen(false);
        setEditingTaskId(null);
        setAttachmentFiles([]);
        setAddTaskForm({
            projectName: "",
            module: "",
            taskName: "",
            type: "",
            actualStartDate: "",
            actualEndDate: "",
            startTime: "",
            dueTime: "",
            assignTo: "",
            description: "",
            checklist: "",
        });
    };
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const [openFormDropdown, setOpenFormDropdown] =
        useState<FormDropdownId>(null);
    const formProjectTriggerRef = useRef<HTMLButtonElement>(null);
    const formProjectMenuRef = useRef<HTMLDivElement>(null);
    const formModuleTriggerRef = useRef<HTMLButtonElement>(null);
    const formModuleMenuRef = useRef<HTMLDivElement>(null);
    const formTypeTriggerRef = useRef<HTMLButtonElement>(null);
    const formTypeMenuRef = useRef<HTMLDivElement>(null);
    const formAssignTriggerRef = useRef<HTMLButtonElement>(null);
    const formAssignMenuRef = useRef<HTMLDivElement>(null);
    const formStartTimeTriggerRef = useRef<HTMLButtonElement>(null);
    const formStartTimeMenuRef = useRef<HTMLDivElement>(null);
    const formEndTimeTriggerRef = useRef<HTMLButtonElement>(null);
    const formEndTimeMenuRef = useRef<HTMLDivElement>(null);
    const [attachmentPreviewFile, setAttachmentPreviewFile] = useState<File | null>(null);

    const dropdownsContainerRef = useRef<HTMLDivElement>(null);
    const employeeTriggerRef = useRef<HTMLButtonElement>(null);
    const employeeMenuRef = useRef<HTMLDivElement>(null);
    const projectsTriggerRef = useRef<HTMLButtonElement>(null);
    const projectsMenuRef = useRef<HTMLDivElement>(null);
    const showTriggerRef = useRef<HTMLButtonElement>(null);
    const showMenuRef = useRef<HTMLDivElement>(null);
    const periodTriggerRef = useRef<HTMLButtonElement>(null);
    const periodMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (openDropdown === null) return;
        const handleClickOutside = (e: MouseEvent) => {
            const el = dropdownsContainerRef.current;
            if (el && !el.contains(e.target as Node)) setOpenDropdown(null);
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [openDropdown]);

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const files = input.files;
        if (!files?.length) return;
        const newFiles = Array.from(files);
        setAttachmentFiles((prev) => [...prev, ...newFiles]);
        input.value = "";
    };

    const removeAttachment = (index: number) => {
        setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (openFormDropdown === null) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const refs: React.RefObject<HTMLElement | null>[] =
                openFormDropdown === "project"
                    ? [formProjectTriggerRef, formProjectMenuRef]
                    : openFormDropdown === "module"
                        ? [formModuleTriggerRef, formModuleMenuRef]
                        : openFormDropdown === "type"
                            ? [formTypeTriggerRef, formTypeMenuRef]
                            : openFormDropdown === "type_start_time"
                                ? [formStartTimeTriggerRef, formStartTimeMenuRef]
                                : openFormDropdown === "type_end_time"
                                    ? [formEndTimeTriggerRef, formEndTimeMenuRef]
                                    : [formAssignTriggerRef, formAssignMenuRef];
            const inside = refs.some((r) => r.current && r.current.contains(target));
            if (!inside) setOpenFormDropdown(null);
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [openFormDropdown]);

    useEffect(() => {
        const params: Record<string, string> = {};
        if (statusFilter) params.status = statusFilter;
        if (isTeam) {
            params.condition = "1";
            params.employeeid = "all";
        }

        Promise.all([
            api.get<{ tasks?: Task[] }>("/api/tasks", { params }),
            api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params }),
            api.get<{ employees?: Employee[] }>("/api/employees"),
            api.get<{ projects?: Project[] }>("/api/projects"),
            api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects")
        ])
            .then(([resTasks, resVendorTasks, resEmployees, resProjects, resVendorProjects]) => {
                const internalTasks = (resTasks.data.tasks ?? []).map(t => ({ ...t, source: "In House" }));
                const vendorTasks = (resVendorTasks.data.tasks ?? []).map(t => ({ ...t, source: "Outsource" }));
                setList([...internalTasks, ...vendorTasks] as Task[]);

                setEmployees((resEmployees.data.employees ?? []).filter(isEmployeeActiveForProjectAssignment));

                const internalProjs = (resProjects.data.projects ?? []).map(p => ({ ...p, source: "In House" }));
                const vendorProjs = (resVendorProjects.data.projects ?? []).map(p => ({ ...p, source: "Outsource" }));
                setProjects([...internalProjs, ...vendorProjs] as Project[]);
            })
            .catch(() => {
                setList([]);
            })
            .finally(() => setLoading(false));
    }, [isTeam, statusFilter]);

    useEffect(() => {
        if (!addTaskForm.projectName) {
            setModules([]);
            return;
        }
        const selectedProj = projects.find(p => p.project_name === addTaskForm.projectName);
        if (selectedProj) {
            api.post<{ success: boolean; modules: { label: string }[] }>("/api/projects/filters/modules", { projectId: selectedProj.id })
                .then(({ data }) => {
                    setModules(data.modules.map(m => m.label));
                })
                .catch(() => setModules([]));
        }
    }, [addTaskForm.projectName, projects]);

    const projectOptions = [
        "Select Projects",
        ...projects.map(p => p.project_name)
    ];
    const modalProjectOptions = projects.map(p => ({ value: p.project_name, label: p.project_name }));
    const modalModuleOptions = modules.map(m => ({ value: m, label: m }));


    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden">
            <div className="bg-white px-4 sm:px-6 pb-4 shrink-0 z-10 pt-2">
                {/* Top row: title + Filters + Add task */}
                <div className="max-w-full mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center justify-between gap-4 w-full lg:w-auto">
                        <h2 className="text-[20px] sm:text-[24px] font-semibold text-slate-800 font-Gantari whitespace-nowrap">
                            Team Task
                        </h2>
                        {/* Mobile/Tablet Add Task Button */}
                        <div className="lg:hidden">
                            <button
                                type="button"
                                disabled={isOutsourceProjectSelected}
                                onClick={() =>
                                    navigate("/bl/teamtasks/add", {
                                        state: { from: "teamtasks" },
                                    })
                                }
                                className={`inline-flex items-center justify-center gap-2 rounded-md px-3 sm:px-4 h-[36px] min-h-[36px] text-[14px] font-medium shadow-sm cursor-pointer transition-all ${isOutsourceProjectSelected ? "bg-gray-400 text-white cursor-not-allowed opacity-70" : "bg-[#DD4342] text-[#F2F2F2] hover:bg-[#c33a39]"}`}
                                title={isOutsourceProjectSelected ? "Cannot add tasks to Outsource projects" : "Add task"}
                            >
                                <img src={AddBtn} alt="Add" className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="hidden sm:inline whitespace-nowrap">Add task</span>
                                <span className="sm:hidden whitespace-nowrap">Add</span>
                            </button>
                        </div>
                    </div>

                    <div
                        ref={dropdownsContainerRef}
                        className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-start lg:justify-end gap-2 w-full lg:w-auto overflow-visible"
                    >
                        <TaskDropdown
                            label="Select Employee"
                            options={employeeOptions}
                            selected={selectedEmployee}
                            onSelect={setSelectedEmployee}
                            isOpen={openDropdown === "employee"}
                            onToggle={() =>
                                setOpenDropdown((d) => (d === "employee" ? null : "employee"))
                            }
                            onClose={() => setOpenDropdown(null)}
                            triggerRef={employeeTriggerRef}
                            dropdownRef={employeeMenuRef}
                            searchable
                            searchPlaceholder="Search employee..."
                            maxVisibleItems={4}
                        />
                        <TaskDropdown
                            label="Select Projects"
                            options={projectOptions}
                            selected={selectedProject}
                            onSelect={setSelectedProject}
                            isOpen={openDropdown === "projects"}
                            onToggle={() =>
                                setOpenDropdown((d) => (d === "projects" ? null : "projects"))
                            }
                            onClose={() => setOpenDropdown(null)}
                            triggerRef={projectsTriggerRef}
                            dropdownRef={projectsMenuRef}
                            searchable
                            searchPlaceholder="Search project..."
                            maxVisibleItems={4}
                        />
                        <TaskDropdown
                            label="Show"
                            options={SHOW_OPTIONS}
                            selected={selectedShow}
                            onSelect={setSelectedShow}
                            isOpen={openDropdown === "show"}
                            onToggle={() =>
                                setOpenDropdown((d) => (d === "show" ? null : "show"))
                            }
                            onClose={() => setOpenDropdown(null)}
                            triggerRef={showTriggerRef}
                            dropdownRef={showMenuRef}
                            narrow
                            maxVisibleItems={4}
                        />
                        <TaskDropdown
                            label="Period"
                            options={PERIOD_OPTIONS}
                            selected={selectedPeriod}
                            onSelect={setSelectedPeriod}
                            isOpen={openDropdown === "period"}
                            onToggle={() =>
                                setOpenDropdown((d) => (d === "period" ? null : "period"))
                            }
                            onClose={() => setOpenDropdown(null)}
                            triggerRef={periodTriggerRef}
                            dropdownRef={periodMenuRef}
                            narrow
                            maxVisibleItems={4}
                        />
                        {/* Desktop Add Task Button */}
                        <div className="hidden lg:block ml-2">
                            <button
                                type="button"
                                disabled={isOutsourceProjectSelected}
                                onClick={() =>
                                    navigate("/bl/teamtasks/add", {
                                        state: { from: "teamtasks" },
                                    })
                                }
                                className={`inline-flex items-center justify-center gap-2 rounded-md px-4 h-[36px] min-h-[36px] text-[14px] font-medium shadow-sm cursor-pointer transition-all ${isOutsourceProjectSelected ? "bg-gray-400 text-white cursor-not-allowed opacity-70" : "bg-[#DD4342] text-[#F2F2F2] hover:bg-[#c33a39]"}`}
                                title={isOutsourceProjectSelected ? "Cannot add tasks to Outsource projects" : "Add task"}
                            >
                                <img src={AddBtn} alt="Add" className="h-5 w-5" />
                                <span className="whitespace-nowrap">Add task</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 custom-scrollbar bg-[#FFFFFF]">
                <div className="max-w-full mx-auto space-y-6">
                    {/* Status summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <Link
                            to={statusFilter === "todo" ? pathname : `${pathname}?status=todo`}
                            className={`flex p-3 sm:p-4 gap-2 sm:gap-4 rounded-xl border shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "todo" ? "bg-orange-50 border-orange-300 ring-1 ring-orange-300" : "bg-white border-slate-200"}`}
                        >
                            <span className="text-[18px] sm:text-[20px] font-bold text-[#0D1829]">To Do</span>
                            <span className="text-[18px] sm:text-[20px] font-bold text-[#0D1829]">({counts.todo})</span>
                            <div className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 flex items-center justify-center">
                                <img src={Group1} alt="Group1" className="w-6 h-6 sm:w-8 sm:h-8" />
                            </div>
                        </Link>

                        <Link
                            to={
                                statusFilter === "in_progress"
                                    ? pathname
                                    : `${pathname}?status=in_progress`
                            }
                            className={`flex p-3 sm:p-4 gap-2 sm:gap-4 rounded-xl border shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200"}`}
                        >
                            <span className="text-[18px] sm:text-[20px] font-bold text-[#0D1829]">In Progress</span>
                            <span className="text-[18px] sm:text-[20px] font-bold text-[#0D1829]">({counts.in_progress})</span>
                            <div className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 flex items-center justify-center">
                                <img src={Group2} alt="Group2" className="w-6 h-6 sm:w-8 sm:h-8" />
                            </div>
                        </Link>

                        <Link
                            to={
                                statusFilter === "completed"
                                    ? pathname
                                    : `${pathname}?status=completed`
                            }
                            className={`flex p-3 sm:p-4 gap-2 sm:gap-4 rounded-xl border shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "completed" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-white border-slate-200"}`}
                        >
                            <span className="text-[18px] sm:text-[20px] font-bold text-[#0D1829]">Completed</span>
                            <span className="text-[18px] sm:text-[20px] font-bold text-[#0D1829]">({counts.completed})</span>
                            <div className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 flex items-center justify-center">
                                <img src={Group3} alt="Group3" className="w-6 h-6 sm:w-8 sm:h-8" />
                            </div>
                        </Link>
                    </div>

                    {/* Task columns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div
                        className="space-y-2 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            const taskId = Number(e.dataTransfer.getData("taskId"));
                            if (!Number.isNaN(taskId)) handleMoveTask(taskId, "todo");
                        }}
                    >
                        {displayedTasksByStatus.todo.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                status={normalizeStatus(task.status, task.Approval)}
                                onViewTask={openViewTask}
                                onEditTask={openEditTask}
                                onDeleteTask={openDeleteTask}
                            />
                        ))}
                    </div>
                    <div
                        className="space-y-2 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            const taskId = Number(e.dataTransfer.getData("taskId"));
                            if (!Number.isNaN(taskId)) handleMoveTask(taskId, "in_progress");
                        }}
                    >
                        {displayedTasksByStatus.in_progress.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                status={normalizeStatus(task.status, task.Approval)}
                                onViewTask={openViewTask}
                                onEditTask={openEditTask}
                                onDeleteTask={openDeleteTask}
                            />
                        ))}
                    </div>
                    <div
                        className="space-y-2 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            const taskId = Number(e.dataTransfer.getData("taskId"));
                            if (!Number.isNaN(taskId)) handleMoveTask(taskId, "completed");
                        }}
                    >
                        {displayedTasksByStatus.completed.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                status={normalizeStatus(task.status, task.Approval)}
                                onViewTask={openViewTask}
                                onEditTask={openEditTask}
                                onDeleteTask={openDeleteTask}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>

            {deleteTask !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
                        {/* Close */}
                        <button
                            type="button"
                            onClick={() => setDeleteTask(null)}
                            className="absolute left-4 top-4 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
                            title="Close"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h3 className="text-[18px] font-gantari font-semibold text-[#020202] mt-[12px] mb-3">
                            Delete Task
                        </h3>
                        <p className="text-[14px] font-gantari font-semibold text-[#020202] mb-8 md:mb-10 text-center">
                            Are you sure, you want to Delete this?
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto mb-6">
                            <button
                                type="button"
                                onClick={() => setDeleteTask(null)}
                                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteTask}
                                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#FFD9D9] text-[#E00100] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add New Task modal */}
            {addTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-[#FFFFFF] rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <button
                                type="button"
                                onClick={resetTaskFormAndClose}
                                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                                aria-label="Close"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                            <h3 className="text-lg font-semibold text-black">
                                {editingTaskId !== null ? "Edit Task" : "Add New Task"}
                            </h3>
                            <div className="w-9" />
                        </div>
                        <form
                            className="flex-1 overflow-y-auto p-6"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const isEditing = editingTaskId !== null;
                                const existing = isEditing
                                    ? merged.find((t) => t.id === editingTaskId)
                                    : null;

                                const payload = {
                                    projectid: projects.find(p => p.project_name === addTaskForm.projectName)?.id || addTaskForm.projectName,
                                    taskName: addTaskForm.taskName,
                                    category: addTaskForm.type,
                                    startdate: addTaskForm.actualStartDate,
                                    dueDate: addTaskForm.actualEndDate,
                                    startTime: addTaskForm.startTime,
                                    dueTime: addTaskForm.dueTime,
                                    assignedTo: employees.find(e => e.full_name === addTaskForm.assignTo)?.id || addTaskForm.assignTo,
                                    description: addTaskForm.description,
                                    checklist: addTaskForm.checklist,
                                    modules: addTaskForm.module
                                };

                                const handleFiles = (taskId: number | string) => {
                                    if (attachmentFiles.length > 0) {
                                        const formData = new FormData();
                                        attachmentFiles.forEach(f => formData.append("image", f));
                                        api.post(`/api/tasks/${taskId}/output-files`, formData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        });
                                    }
                                };

                                if (isEditing && existing) {
                                    api.patch(`/api/tasks/${existing.id}`, {
                                        task_name: payload.taskName,
                                        assigned_to: payload.assignedTo,
                                        due_date: payload.dueDate,
                                        category: payload.category,
                                        description: payload.description,
                                        checklist: payload.checklist,
                                        modules_name: payload.modules,
                                        Actual_start_time: payload.startdate,
                                        start_time: payload.startTime,
                                        due_time: payload.dueTime
                                    }).then(() => {
                                        handleFiles(existing.id);
                                        const params: Record<string, string> = { condition: isTeam ? "1" : "0" };
                                        if (statusFilter) params.status = statusFilter;
                                        api.get<{ tasks?: Task[] }>("/api/tasks", { params })
                                            .then(res => setList(res.data.tasks ?? []));
                                    });
                                } else {
                                    api.post<{ success: boolean; task_id: number }>('/api/tasks', payload).then(res => {
                                        if (res.data.success && res.data.task_id) {
                                            handleFiles(res.data.task_id);
                                            const params: Record<string, string> = { condition: isTeam ? "1" : "0" };
                                            if (statusFilter) params.status = statusFilter;
                                            api.get<{ tasks?: Task[] }>("/api/tasks", { params })
                                                .then(r => setList(r.data.tasks ?? []));
                                        }
                                    });
                                }
                                resetTaskFormAndClose();
                            }}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Project Name
                                    </label>
                                    <FormDropdown
                                        label="Select Project"
                                        options={[
                                            { value: "", label: "Select Project" },
                                            ...modalProjectOptions,
                                        ]}
                                        value={addTaskForm.projectName}
                                        onChange={(v) =>
                                            setAddTaskForm((f) => ({ ...f, projectName: v }))
                                        }
                                        isOpen={openFormDropdown === "project"}
                                        onToggle={() =>
                                            setOpenFormDropdown((d) =>
                                                d === "project" ? null : "project",
                                            )
                                        }
                                        onClose={() => setOpenFormDropdown(null)}
                                        triggerRef={formProjectTriggerRef}
                                        dropdownRef={formProjectMenuRef}
                                        searchable
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Select Module
                                    </label>
                                    <FormDropdown
                                        label="Select Module"
                                        options={[
                                            { value: "", label: "Select Module" },
                                            ...modalModuleOptions,
                                        ]}
                                        value={addTaskForm.module}
                                        onChange={(v) =>
                                            setAddTaskForm((f) => ({ ...f, module: v }))
                                        }
                                        isOpen={openFormDropdown === "module"}
                                        onToggle={() =>
                                            setOpenFormDropdown((d) =>
                                                d === "module" ? null : "module",
                                            )
                                        }
                                        onClose={() => setOpenFormDropdown(null)}
                                        triggerRef={formModuleTriggerRef}
                                        dropdownRef={formModuleMenuRef}
                                        searchable
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Task Name
                                    </label>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            value={addTaskForm.taskName}
                                            onChange={(e) =>
                                                setAddTaskForm((f) => ({
                                                    ...f,
                                                    taskName: e.target.value,
                                                }))
                                            }
                                            placeholder="Enter Task / Select Task"
                                            className={`flex-1 bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none ${editingTaskId !== null ? "rounded-sm" : "rounded-l-sm"
                                                }`}
                                        />
                                        {editingTaskId === null && (
                                            <button
                                                type="button"
                                                className="rounded-l-none rounded-r-sm bg-[#E2E2E2] px-4 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50 cursor-pointer"
                                            >
                                                Tasklist
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Type
                                        </label>
                                        <FormDropdown
                                            label="Select Type"
                                            options={[
                                                { value: "", label: "Select Type" },
                                                { value: "task", label: "Task" },
                                                { value: "bug", label: "Bug" },
                                                { value: "feature", label: "Feature" },
                                            ]}
                                            value={addTaskForm.type}
                                            onChange={(v) =>
                                                setAddTaskForm((f) => ({ ...f, type: v }))
                                            }
                                            isOpen={openFormDropdown === "type"}
                                            onToggle={() =>
                                                setOpenFormDropdown((d) =>
                                                    d === "type" ? null : "type",
                                                )
                                            }
                                            onClose={() => setOpenFormDropdown(null)}
                                            triggerRef={formTypeTriggerRef}
                                            dropdownRef={formTypeMenuRef}
                                            searchable
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Actual Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={addTaskForm.actualStartDate}
                                            onChange={(e) =>
                                                setAddTaskForm((f) => ({
                                                    ...f,
                                                    actualStartDate: e.target.value,
                                                }))
                                            }
                                            placeholder="dd/mm/yyyy"
                                            className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Actual End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={addTaskForm.actualEndDate}
                                            onChange={(e) =>
                                                setAddTaskForm((f) => ({
                                                    ...f,
                                                    actualEndDate: e.target.value,
                                                }))
                                            }
                                            placeholder="dd/mm/yyyy"
                                            className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Select Start Time
                                        </label>
                                        <button
                                            ref={formStartTimeTriggerRef}
                                            type="button"
                                            onClick={() =>
                                                setOpenFormDropdown((d) =>
                                                    d === "type_start_time" ? null : "type_start_time",
                                                )
                                            }
                                            className="flex w-full items-center justify-between rounded-sm bg-[#E8E8E8] px-3 py-2 text-left text-sm cursor-pointer"
                                        >
                                            <span className={addTaskForm.startTime ? "text-[#353535]" : "text-[#616161]"}>
                                                {formatTimeForDisplay(addTaskForm.startTime)}
                                            </span>
                                            <svg className="ml-2 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {openFormDropdown === "type_start_time" && (
                                            <div ref={formStartTimeMenuRef} className="absolute top-full left-0 z-20 mt-1">
                                                <TimePickerWheel
                                                    value={addTaskForm.startTime}
                                                    onChange={(v) => setAddTaskForm((f) => ({ ...f, startTime: v }))}
                                                    onClose={() => setOpenFormDropdown(null)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Select End Time
                                        </label>
                                        <button
                                            ref={formEndTimeTriggerRef}
                                            type="button"
                                            onClick={() =>
                                                setOpenFormDropdown((d) =>
                                                    d === "type_end_time" ? null : "type_end_time",
                                                )
                                            }
                                            className="flex w-full items-center justify-between rounded-sm bg-[#E8E8E8] px-3 py-2 text-left text-sm cursor-pointer"
                                        >
                                            <span className={addTaskForm.dueTime ? "text-[#353535]" : "text-[#616161]"}>
                                                {formatTimeForDisplay(addTaskForm.dueTime)}
                                            </span>
                                            <svg className="ml-2 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {openFormDropdown === "type_end_time" && (
                                            <div ref={formEndTimeMenuRef} className="absolute top-full left-0 z-20 mt-1">
                                                <TimePickerWheel
                                                    value={addTaskForm.dueTime}
                                                    onChange={(v) => setAddTaskForm((f) => ({ ...f, dueTime: v }))}
                                                    onClose={() => setOpenFormDropdown(null)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Assign To
                                        </label>
                                        <FormDropdown
                                            label="Select Assign To"
                                            options={[
                                                { value: "", label: "Select Assign To" },
                                                ...employeesForAssignDropdown.map(e => ({ value: e.full_name, label: e.full_name })),
                                            ]}
                                            value={addTaskForm.assignTo}
                                            onChange={(v) =>
                                                setAddTaskForm((f) => ({ ...f, assignTo: v }))
                                            }
                                            isOpen={openFormDropdown === "assignTo"}
                                            onToggle={() =>
                                                setOpenFormDropdown((d) =>
                                                    d === "assignTo" ? null : "assignTo",
                                                )
                                            }
                                            onClose={() => setOpenFormDropdown(null)}
                                            triggerRef={formAssignTriggerRef}
                                            dropdownRef={formAssignMenuRef}
                                            searchable
                                        />
                                    </div>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={addTaskForm.description}
                                        onChange={(e) =>
                                            setAddTaskForm((f) => ({
                                                ...f,
                                                description: e.target.value,
                                            }))
                                        }
                                        placeholder="Enter Description..."
                                        rows={3}
                                        className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Checklist
                                    </label>
                                    <input
                                        type="text"
                                        value={addTaskForm.checklist}
                                        onChange={(e) =>
                                            setAddTaskForm((f) => ({
                                                ...f,
                                                checklist: e.target.value,
                                            }))
                                        }
                                        placeholder="Enter Reference Link"
                                        className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Attachments
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        id="add-task-file-input"
                                        type="file"
                                        multiple
                                        className="sr-only"
                                        onChange={handleAttachmentChange}
                                        accept="*/*"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        <div className="flex flex-1 min-w-0">
                                            <input
                                                type="text"
                                                readOnly
                                                value={
                                                    attachmentFiles.length > 0
                                                        ? attachmentFiles.map((f) => f.name).join(", ")
                                                        : ""
                                                }
                                                placeholder="Upload Files"
                                                className="flex-1 rounded-l-sm rounded-r-none bg-[#F2F3F4] px-3 py-2 text-sm text-[#101827] placeholder:text-[#8B8B8B] focus:outline-none truncate"
                                                title={
                                                    attachmentFiles.length > 0
                                                        ? attachmentFiles.map((f) => f.name).join(", ")
                                                        : undefined
                                                }
                                            />
                                            <label
                                                htmlFor="add-task-file-input"
                                                className="rounded-r-sm rounded-l-none bg-[#E2E2E2] px-4 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50 cursor-pointer inline-flex items-center"
                                            >
                                                Browse File
                                            </label>
                                        </div>
                                    </div>
                                    {attachmentFiles.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {attachmentFiles.map((file, index) => (
                                                <AttachmentPreviewItem
                                                    key={`${file.name}-${index}-${file.size}`}
                                                    file={file}
                                                    onRemove={() => removeAttachment(index)}
                                                    onPreviewClick={setAttachmentPreviewFile}
                                                />
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-center gap-3 mt-6 pt-4 ">
                                <button
                                    type="button"
                                    onClick={resetTaskFormAndClose}
                                    className="rounded-lg bg-[#F2F2F2] px-5 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50 cursor-pointer"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#DBE9FE] px-5 py-2 text-sm font-medium text-[#101827] hover:bg-[#D5E6FF] cursor-pointer"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <AttachmentPreviewModal
                file={attachmentPreviewFile}
                onClose={() => setAttachmentPreviewFile(null)}
            />
        </div>
    );
}
