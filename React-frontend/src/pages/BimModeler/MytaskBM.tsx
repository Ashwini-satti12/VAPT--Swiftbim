import { useEffect, useState, useRef } from "react";
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import Group1 from "../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../assets/ProjectManager/MyTask/Group3.svg";
import Arrow from "../../assets/ProjectManager/MyTask/arrow.svg";
import Dot from "../../assets/ProjectManager/MyTask/Dot.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import AddBtn from "../../assets/TechnicalDirector/add btn.svg";
import { isEmployeeActiveForProjectAssignment } from "../../utils/employeeActive";
import closeIcon from "../../assets/ProjectManager/project/close button.png";
import { useAuth } from "../../contexts/AuthContext";


export function formatTimeForDisplay(value: string): string {
  if (!value || !value.match(/^\d{1,2}:\d{2}$/)) return "--:--";
  const [hStr, mStr] = value.split(":");
  const h24 = parseInt(hStr, 10);
  const m = mStr || "00";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? "AM" : "PM";
  return `${h12}:${m} ${ampm}`;
}

type DropdownId = "employee" | "projects" | "show" | "period" | null;

export type FormDropdownId =
  | "project"
  | "module"
  | "type"
  | "assignTo"
  | "type_start_time"
  | "type_end_time"
  | null;

export interface Employee {
  id: number;
  full_name: string;
  profile_picture?: string;
  active?: string;
}

export interface Project {
  id: number;
  project_name: string;
  modules?: string;
  tasks?: string;
  source?: "In House" | "Outsource";
  project_manager_name?: string | null;
  lead_name?: string | null;
  bim_coordinator_name?: string | null;
  uploader_name?: string | null;
  members?: string;
  members_names?: string[];
}
const getApiBaseUrl = () => import.meta.env.VITE_API_URL || "";

const getProfileUrl = (path: string | undefined): string => {
  if (!path || path.trim() === "") return "";
  if (path.startsWith("http")) return path;
  const normalizedPath = path
    .replace(/\\/g, "/")
    .trim()
    .replace(/^\d+\s+/, "")
    .replace(/^\/+/, "");
  const apiBaseUrl = getApiBaseUrl();
  let urlPath = "";
  if (normalizedPath.startsWith("employee/")) {
    const parts = normalizedPath.split("/");
    const encodedParts = parts.map((part, index) =>
      index === 0 ? part : encodeURIComponent(part),
    );
    urlPath = `/uploads/${encodedParts.join("/")}`;
  } else if (normalizedPath.startsWith("profiles/")) {
    const filename = normalizedPath.replace("profiles/", "");
    urlPath = `/uploads/employee/${encodeURIComponent(filename)}`;
  } else if (!normalizedPath.includes("/")) {
    urlPath = `/uploads/employee/${encodeURIComponent(normalizedPath)}`;
  } else {
    const parts = normalizedPath.split("/");
    const encodedParts = parts.map((part, index) =>
      index === 0 ? part : encodeURIComponent(part),
    );
    urlPath = `/uploads/${encodedParts.join("/")}`;
  }
  return `${apiBaseUrl}${urlPath}`;
};

/** Formats YYYY-MM-DD or ISO string to DD/MM/YYYY for display. */
export function formatDateForDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const datePart = value.includes("T") ? value.split("T")[0] : value;
  const parts = datePart.split("-");
  if (parts.length !== 3) return value;
  const [y, m, d] = parts;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

export interface Task {
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
  outputfilepath?: string;
  source?: "In House" | "Outsource";
  projectid?: number;
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

export function TaskDropdown({
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
        o === first &&
        (first === "Select Employee" || first === "Select Projects");
      return options.filter((opt) => {
        if (isPlaceholderOption(opt)) return false;
        const name = String(opt ?? "")
          .trim()
          .toLowerCase();
        return name.includes(q);
      });
    })()
    : options;
  const listMaxHeight = `${maxVisibleItems * 40}px`;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-4 py-2 text-[14px] font-semibold font-Gantari cursor-pointer ${narrow ? (label === "Period" ? "min-w-[130px]" : "min-w-[150px]") : "min-w-[160px]"}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span
          className={`truncate font-Gantari ${selected && selected !== label ? "text-[#353535]" : "text-[#8B8B8B]"}`}
        >
          {(label.toLowerCase() === "show entries" ||
            label.toLowerCase() === "show") &&
            selected &&
            selected !== label ? (
            <>
              <span className="text-[14px]">Show:</span>{" "}
              <span className="font-semibold">{selected}</span>
            </>
          ) : (
            selected || label
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
          className={`absolute top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg ${narrow ? "right-0 min-w-[110px]" : "left-0 min-w-[160px]"}`}
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
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-[14px] text-slate-800 placeholder-slate-400"
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
                className={`block w-full px-4 py-2 text-left text-[14px] font-Gantari font-normal transition-colors cursor-pointer ${selected === opt ? "bg-[#F2F2F2] text-[#353535]" : "text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]"}`}
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

interface FormDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  searchable?: boolean;
}

export function FormDropdown({
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
  const filteredOptions =
    searchable && q
      ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(q) ||
          String(opt.value).toLowerCase().includes(q),
      )
      : options;

  const displayLabel = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : label;
  return (
    <div className="relative w-full">
      <button
        ref={triggerRef as any}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex w-full items-center justify-between rounded-md bg-[#F2F3F4] px-3 py-2 text-left text-[14px] cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span className={value ? "text-[#353535]" : "text-[#8B8B8B]"}>
          {displayLabel}
        </span>
        <img
          src={ArrowDown}
          alt="arrow"
          className={`ml-2 w-3 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
                className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-800 placeholder-slate-400"
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
                className="block w-full px-3 py-2 text-left text-[14px] text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2] first:rounded-t-lg last:rounded-b-lg cursor-pointer"
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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function taskToFormValues(task: Task | Record<string, unknown>): {
  projectName: string;
  module: string;
  taskName: string;
  type: string;
  actualStartDate: string;
  actualEndDate: string;
  startTime: string;
  dueTime: string;
  assignTo: string;
  description: string;
  checklist: string;
} {
  const t = task as Record<string, unknown>;
  const str = (v: unknown) => (v != null ? String(v) : "");
  const dateOnly = (v: unknown) => {
    if (v == null) return "";
    const s = str(v).trim();
    if (!s) return "";
    // ISO / datetime: YYYY-MM-DD...
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // Legacy formats: DD-MM-YYYY / DD/MM/YYYY -> YYYY-MM-DD for <input type="date">
    const dmy = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    return s.length >= 10 ? s.slice(0, 10) : s;
  };
  const timeOnly = (v: unknown) => {
    if (v == null) return "";
    const s = str(v);
    const match = s.match(/(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, "0")}:${match[2]}` : s.slice(0, 5);
  };
  return {
    projectName: str(t.project_name ?? t.projectName ?? ""),
    module: str(t.module ?? t.modules_name ?? ""),
    taskName: str(t.task_name ?? t.taskName ?? ""),
    type: str(t.type ?? t.category ?? ""),
    actualStartDate: dateOnly(
      t.start_date ?? t.startDate ?? t.Actual_start_time ?? "",
    ),
    actualEndDate: dateOnly(t.due_date ?? t.dueDate ?? ""),
    startTime: timeOnly(
      t.perferstart_time ??
      t.start_time ??
      t.startTime ??
      t.Actual_start_time ??
      "",
    ),
    dueTime: timeOnly(
      t.perferend_time ?? t.due_time ?? t.dueTime ?? t.end_time ?? "",
    ),
    assignTo: str(
      t.assigned_full_name ??
      t.assign_to_name ??
      t.assign_to ??
      t.assignTo ??
      t.assigned_to ??
      "",
    ),
    description: str(t.description ?? ""),
    checklist: str(t.checklist ?? ""),
  };
}

function normalizeStatus(
  s: string | undefined,
  approval?: string,
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
  onApproveTask?: (task: Task) => void;
}) {
  const { user } = useAuth();
  const isDelegated =
    task.uploaderid != null &&
    task.assigned_to != null &&
    String(task.uploaderid) !== String(task.assigned_to);
  const isReviewTask = isDelegated && String(task.uploaderid) === String(user?.id);
  const isUnderReview = isDelegated && status === "completed" && task.Approval?.toLowerCase() !== "approved";
  const isReviewed = isDelegated && task.Approval?.toLowerCase() === "approved";
  const progress =
    status === "todo"
      ? 0
      : status === "in_progress"
        ? 50
        : 95;
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
    if (status === "completed") {
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
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm relative ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <h4 className="font-medium text-[#353535] text-[20px] truncate leading-tight">
          {task.task_name || "Task Name"}
        </h4>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            draggable={false}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="p-0.5 rounded cursor-pointer"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <img src={Dot} alt="Dot" className="w-4 h-4 text-slate-600" />
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
              {!isCompleted && (
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
                      className="w-5 h-5 transition-[filter] [filter:invert(40%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                    />
                    <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                      Delete
                    </span>
                  </button>
                </>
              )}
              {isUnderReview && String(task.uploaderid) === String(user?.id) && (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
                  onClick={() => {
                    setMenuOpen(false);
                    onApproveTask?.(task);
                  }}
                >
                  <div className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100 text-green-600 transition-colors group-hover:bg-green-600 group-hover:text-white">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[14px] font-medium text-[#616161] font-Gantari group-hover:text-green-600">
                    Approve
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex flex-col ">
          <span className="text-[14px] font-medium text-[#000000]">
            Start Date
          </span>
          <span className="text-[14px] font-medium text-[#8B8B8B]">
            {formatDateForDisplay(task.start_date || task.Actual_start_time) || "—"}
          </span>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-[14px] font-medium text-[#000000]">
            End Date
          </span>
          <span className="text-[14px] font-medium text-[#8B8B8B]">
            {formatDateForDisplay(task.due_date) || "—"}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[12px] text-[#8B8B8B]">Progress</span>
        <span className="text-[12px] text-[#8B8B8B]">
          {isReviewTask && !isReviewed
            ? `${progress}% (Under Review)`
            : isReviewed
              ? `100% (Reviewed)`
              : isUnderReview
                ? `95% (Under Review)`
                : `${progress}%`}
        </span>
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
                    ? getGlobalProfileUrl(
                      task.assigned_to,
                      task.assigned_profile_picture,
                    )
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
                    className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
                    title={`Assigned To: ${task.assigned_full_name}`}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={task.assigned_full_name}
                        className="w-full h-full object-cover"
                      />
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
                    ? getGlobalProfileUrl(
                      task.uploaderid,
                      task.uploader_profile_picture,
                    )
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
                    className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
                    title={`Assigned By: ${task.uploader_full_name}`}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={task.uploader_full_name}
                        className="w-full h-full object-cover"
                      />
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

const SHOW_OPTIONS = ["Show Entries", "0-50", "51-100", "101-150", "151-200", "201-250", "251-300", "All"];
const PERIOD_OPTIONS = [
  "Period",
  "This Week",
  "This Month",
  "This Quarter",
  "Show All",
];

export default function MytaskBM() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const ismy =
    searchParams.get("condition") === "1" || pathname.endsWith("/my");
  const statusFilter =
    searchParams.get("status") || searchParams.get("taskstatus");

  const [list, setList] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(
    "Select Employee",
  );
  const [selectedProject, setSelectedProject] = useState<string | null>(
    "Select Projects",
  );
  const [selectedShow, setSelectedShow] = useState<string | null>(
    "Show Entries",
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>("Period");
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);

  const navigate = useNavigate();

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
    const params: Record<string, string> = { view: "tasks" };
    if (statusFilter) params.status = statusFilter;
    if (ismy) params.condition = "1";

    setLoading(true);
    Promise.all([
      api.get<{ tasks?: Task[] }>("/api/tasks", { params }),
      api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", { params }),
      api.get<{ employees?: Employee[] }>("/api/employees"),
      api.get<{ projects?: Project[] }>("/api/projects"),
      api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
    ])
      .then(([tasksRes1, tasksRes2, empRes, projRes1, projRes2]) => {
        const t1 = (tasksRes1.data.tasks ?? []).map((t) => ({
          ...t,
          source: "In House" as const,
        }));
        const t2 = (tasksRes2.data.tasks ?? []).map((t) => ({
          ...t,
          source: "Outsource" as const,
        }));
        setList([...t1, ...t2]);

        const filteredEmps = (empRes.data.employees ?? []).filter(
          isEmployeeActiveForProjectAssignment,
        );
        setEmployees(filteredEmps);

        const p1 = (projRes1.data.projects ?? []).map((p) => ({
          ...p,
          source: "In House" as const,
        }));
        const p2 = (projRes2.data.projects ?? []).map((p) => ({
          ...p,
          source: "Outsource" as const,
        }));
        setProjects([...p1, ...p2]);
      })
      .catch((err) => {
        console.error("Error fetching tasks/data:", err);
        setList([]);
      })
      .finally(() => setLoading(false));
  }, [ismy, statusFilter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openDropdown === null) return;
      const el = dropdownsContainerRef.current;
      if (el && !el.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdown]);

  const getEmployeeOptions = () => {
    if (
      !selectedProject ||
      ["Select Projects", "Show All", "Projects"].includes(selectedProject)
    ) {
      return [
        "Select Employee",
        "Show All",
        ...employees.map((e) => e.full_name),
      ];
    }
    const proj = projects.find((p) => p.project_name === selectedProject);
    if (!proj)
      return [
        "Select Employee",
        "Show All",
        ...employees.map((e) => e.full_name),
      ];

    const names = new Set<string>();
    if (proj.project_manager_name) names.add(proj.project_manager_name);
    if (proj.lead_name) names.add(proj.lead_name);
    if (proj.bim_coordinator_name) names.add(proj.bim_coordinator_name);
    if (proj.uploader_name) names.add(proj.uploader_name);
    if (Array.isArray(proj.members_names)) {
      proj.members_names.forEach((n) => n && names.add(n));
    }

    return ["Select Employee", "Show All", ...Array.from(names)];
  };

  const employeeOptions = getEmployeeOptions();
  const projectOptions = [
    "Select Projects",
    "Show All",
    ...projects.filter((p) => p.source !== "Outsource").map((p) => p.project_name),
  ];

  const handleApproveTask = (task: Task) => {
    const isOutsource = task.source === "Outsource";
    const endpoint = isOutsource
      ? `/api/vendors/vendor-tasks/${task.id}/status`
      : `/api/tasks/${task.id}/status`;

    api.patch(endpoint, { status: "Approved" })
      .then(() => {
        toast.success("Task Approved");
        setList(prev => prev.map(t => t.id === task.id ? { ...t, Approval: "Approved", progress: 100 } : t));
      })
      .catch(() => toast.error("Failed to approve task"));
  };

  const handleMoveTask = async (
    taskId: number,
    newStatus: "todo" | "in_progress" | "completed",
  ) => {
    const task = list.find((t) => t.id === taskId);
    if (!task) return;

    const current = normalizeStatus(task.status, task.Approval);
    if (current === "todo" && newStatus === "completed") {
      toast.error("Move the task to In Progress before marking it completed.");
      return;
    }
    if (current === "completed" && newStatus !== "completed") {
      toast.error("Completed tasks cannot be moved.");
      return;
    }

    const isOutsource = task.source === "Outsource";
    const projectId =
      task.projectid ||
      projects.find((p) => p.project_name === task.project_name)?.id;
    const endpoint = isOutsource
      ? `/api/vendors/vendor-tasks/${taskId}/status`
      : `/api/tasks/${taskId}/status`;

    const statusMap = {
      todo: "Todo",
      in_progress: "InProgress",
      completed: "Completed",
    };
    const backendStatus = statusMap[newStatus];

    try {
      await api.patch(endpoint, {
        status: backendStatus,
        projectId,
      });
      const label =
        newStatus === "todo"
          ? "To Do"
          : newStatus === "in_progress"
            ? "In Progress"
            : "Completed";
      setList((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: label } : t)),
      );
    } catch (err) {
      console.error("Error moving task:", err);
    }
  };

  const openEditTask = (task: Task) => {
    navigate("/bm/mytasks/add", { state: { task } });
  };

  const openDeleteTask = (task: Task) => {
    setDeleteTaskId(task.id);
  };

  const openViewTask = (task: Task) => {
    navigate(`/bm/mytasks/view/${task.id}`, { state: { task } });
  };

  const confirmDeleteTask = async () => {
    if (deleteTaskId === null) return;
    const task = list.find((t) => t.id === deleteTaskId);
    if (!task) return;

    const isOutsource = task.source === "Outsource";
    const endpoint = isOutsource
      ? `/api/vendors/vendor-tasks/${deleteTaskId}`
      : `/api/tasks/${deleteTaskId}`;

    try {
      await api.delete(endpoint);
      setList((prev) => prev.filter((t) => t.id !== deleteTaskId));
      setDeleteTaskId(null);
      toast.success("Deleted successfully");
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const allTasks = list.filter((t) => {
    if (
      selectedEmployee &&
      !["Select Employee", "Show All", "Employee"].includes(selectedEmployee)
    ) {
      if (t.assigned_full_name !== selectedEmployee) return false;
    }
    if (
      selectedProject &&
      !["Select Projects", "Show All", "Projects"].includes(selectedProject)
    ) {
      if (t.project_name !== selectedProject) return false;
    }
    if (selectedPeriod && !["Period", "Show All"].includes(selectedPeriod)) {
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
    return true;
  });

  const counts = {
    todo: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "todo",
    ).length,
    in_progress: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "in_progress",
    ).length,
    completed: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "completed",
    ).length,
  };

  const tasksByStatus = {
    todo: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "todo",
    ),
    in_progress: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "in_progress",
    ),
    completed: allTasks.filter(
      (t) => normalizeStatus(t.status, t.Approval) === "completed",
    ),
  };

  const showLimit =
    selectedShow === "All" || !selectedShow || selectedShow === "Show Entries"
      ? Number.POSITIVE_INFINITY
      : Number(selectedShow) || 10;

  const displayedTasksByStatus = {
    todo: tasksByStatus.todo.slice(0, showLimit),
    in_progress: tasksByStatus.in_progress.slice(0, showLimit),
    completed: tasksByStatus.completed.slice(0, showLimit),
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex flex-col overflow-hidden px-4 md:px-5 py-2 bg-white">
      <div className="flex-shrink-0 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-[24px] font-medium text-[#000000] font-Gantari">
            {ismy ? "Team Task" : "My Task"}
          </h1>
          <div
            ref={dropdownsContainerRef}
            className="flex flex-wrap items-center gap-2"
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
            />
            <TaskDropdown
              label="Show Entries"
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
            />
            <button
              type="button"
              onClick={() => navigate("/bm/mytasks/add")}
              className="inline-flex items-center gap-2 rounded-md bg-[#DD4342] px-4 py-2 text-[14px] font-medium text-white shadow-sm cursor-pointer"
            >
              <img src={AddBtn} alt="Add" className="h-4 w-4" />
              Add Task
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Link
            to={
              statusFilter === "todo"
                ? pathname
                : `${pathname}?status=todo${ismy ? "&condition=1" : ""}`
            }
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "todo" ? "bg-orange-50 border-orange-300 ring-1 ring-orange-300" : "bg-white border-slate-200"}`}
          >
            <span className="text-[18px] font-bold text-[#000000]">To Do</span>
            <span className="text-[18px] font-bold text-[#000000]">
              ({counts.todo})
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group1} alt="Group1" className="w-8 h-8" />
            </div>
          </Link>

          <Link
            to={
              statusFilter === "in_progress"
                ? pathname
                : `${pathname}?status=in_progress${ismy ? "&condition=1" : ""}`
            }
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200"}`}
          >
            <span className="text-[18px] font-bold text-[#000000]">
              In Progress
            </span>
            <span className="text-[18px] font-bold text-[#000000]">
              ({counts.in_progress})
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group2} alt="Group2" className="w-8 h-8" />
            </div>
          </Link>

          <Link
            to={
              statusFilter === "completed"
                ? pathname
                : `${pathname}?status=completed${ismy ? "&condition=1" : ""}`
            }
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative cursor-pointer ${statusFilter === "completed" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-white border-slate-200"}`}
          >
            <span className="text-[18px] font-bold text-[#000000]">Completed</span>
            <span className="text-[18px] font-bold text-[#000000]">
              ({counts.completed})
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group3} alt="Group3" className="w-8 h-8" />
            </div>
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="space-y-3 min-h-[200px]"
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
                status="todo"
                onViewTask={openViewTask}
                onEditTask={openEditTask}
                onDeleteTask={openDeleteTask}
                onApproveTask={handleApproveTask}
              />
            ))}
          </div>
          <div
            className="space-y-3 min-h-[200px] p-1"
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
                status="in_progress"
                onViewTask={openViewTask}
                onEditTask={openEditTask}
                onDeleteTask={openDeleteTask}
                onApproveTask={handleApproveTask}
              />
            ))}
          </div>
          <div
            className="space-y-3 min-h-[200px] p-1"
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
                status="completed"
                onViewTask={openViewTask}
                onEditTask={openEditTask}
                onDeleteTask={openDeleteTask}
                onApproveTask={handleApproveTask}
              />
            ))}
          </div>
        </div>
      </div>

      {deleteTaskId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
            <div className="absolute left-4 top-4 z-10">
              <div className="relative group inline-flex shrink-0">
                <button
                  type="button"
                  onClick={() => setDeleteTaskId(null)}
                  className="p-2 rounded-md bg-[#F2F2F2] text-[#353535] transition-colors cursor-pointer"
                >
                  <img src={closeIcon} alt="closeIcon" className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10">
                    <span className="font-Gantari text-[12px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                      Close
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-[18px] font-gantari font-semibold text-[#020202] mt-[12px] mb-3">
              Delete Task
            </h3>
            <p className="text-[14px] font-gantari font-semibold text-[#020202] mb-8 md:mb-10 text-center">
              Are you sure, you want to Delete this?
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto mb-6">
              <button
                type="button"
                onClick={() => setDeleteTaskId(null)}
                className="w-full sm:w-auto px-5 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                className="w-full sm:w-auto px-5 py-2 rounded-md bg-[#FFD9D9] text-[#E00100] font-gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
