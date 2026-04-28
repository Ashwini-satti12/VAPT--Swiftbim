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
import Group1 from "../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../assets/ProjectManager/MyTask/Group3.svg";
import Arrow from "../../assets/ProjectManager/MyTask/arrow.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import AddBtn from "../../assets/TechnicalDirector/add btn.svg";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../assets/ProjectManager/project/deleteIcon.svg";
import threedot from "../../assets/ProjectManager/project/threedot.svg";
import { AttachmentPreviewModal } from "../../components/AttachmentPreviewModal";
import { isEmployeeActiveForProjectAssignment } from "../../utils/employeeActive";
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
  active?: string | null;
}

export interface Project {
  id: number;
  project_name: string;
  modules?: string;
  tasks?: string;
  members_names?: string[];
  project_manager_name?: string | null;
  lead_name?: string | null;
  bim_coordinator_name?: string | null;
  uploader_name?: string | null;
  members?: string;
  source?: "In House" | "Outsource";
}

export interface FormDropdownProps {
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
    searchable && isOpen && q
      ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(q) ||
          String(opt.value).toLowerCase().includes(q),
      )
      : options;

  const displayLabel = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : label;

  useEffect(() => {
    if (isOpen && searchable) setSearchQuery("");
  }, [isOpen, searchable]);

  const setRootRef = (node: HTMLDivElement | null) => {
    (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
  };

  const fieldShellClass =
    "flex w-full items-center gap-2 rounded-md border border-transparent bg-[#E8E8E8] px-3 py-2 text-left text-[14px] font-semibold font-Gantari transition-colors focus-within:border-[#AEACAC52]";

  return (
    <div ref={setRootRef} className="relative w-full">
      {isOpen && searchable ? (
        <div className={fieldShellClass}>
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") onClose();
            }}
            placeholder={label}
            className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-[#353535] outline-none placeholder-[#8B8B8B]"
            aria-expanded={isOpen}
            aria-label={label}
            role="combobox"
            aria-autocomplete="list"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="shrink-0 cursor-pointer rounded p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-[#AEACAC52]"
            aria-label="Close list"
          >
            <img
              src={ArrowDown}
              alt=""
              className="h-3 w-3 rotate-180 transition-transform"
            />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`${fieldShellClass} cursor-pointer outline-none focus-visible:border-[#AEACAC52]`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label}
        >
          <span
            className={`min-w-0 flex-1 truncate text-left ${value ? "text-[#353535]" : "text-[#8B8B8B]"}`}
          >
            {displayLabel}
          </span>
          <img
            src={ArrowDown}
            alt=""
            className={`ml-auto h-3 w-3 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      )}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute top-full left-0 z-50 mt-0.5 w-full overflow-hidden rounded-md border border-[#E0E0E0] bg-white shadow-lg"
        >
          <div
            className="min-h-0 overflow-y-auto py-1 custom-scrollbar"
            style={{ maxHeight: "168px" }}
          >
            {filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(opt.value);
                  if (searchable) setSearchQuery("");
                  onClose();
                }}
                className="block w-full px-4 py-2 text-left text-[14px] font-Gantari text-[#8B8B8B] transition-colors hover:bg-[#F2F2F2] hover:text-[#353535] cursor-pointer"
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
  maxVisibleItems = 4,
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
        if (isPlaceholderOption(opt)) return false; // hide placeholder when searching
        const name = String(opt ?? "")
          .trim()
          .toLowerCase();
        return name.includes(q);
      });
    })()
    : options;

  const menuShellClass =
    "flex flex-col overflow-hidden rounded-md border border-[#E0E0E0] bg-white shadow-lg";

  const triggerButtonClass = `inline-flex items-center justify-between rounded-md border border-transparent bg-[#E8E8E8] px-4 py-2 text-[14px] font-semibold font-Gantari cursor-pointer ${narrow ? "w-full" : "min-w-[140px]"}`;

  const triggerTextClass = `truncate font-Gantari ${selected && selected !== label ? "text-[#353535]" : "text-[#8B8B8B]"}`;

  const menuContent = (
    <>
      {searchable && (
        <div className="shrink-0 border-b border-slate-100 bg-white p-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border border-transparent bg-[#F2F3F4] px-3 py-2 text-sm font-Gantari text-[#353535] outline-none transition-colors placeholder-[#8B8B8B] focus:border-[#AEACAC52]"
            aria-label={searchPlaceholder}
          />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto py-1 custom-scrollbar">
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
    </>
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={triggerButtonClass}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span className={triggerTextClass}>
          {(label.toLowerCase() === "show entries" ||
            label.toLowerCase() === "show") &&
            selected &&
            selected !== label ? (
            <>
              <span className="text-[14px]">Show:</span>{" "}
              <span className="font-semibold">{selected}</span>
            </>
          ) : (
            (selected ?? label)
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
          className={`absolute top-full z-50 mt-1 flex max-h-[min(18rem,calc(100vh-7rem))] ${menuShellClass} ${narrow ? "right-0 w-full" : "left-0 min-w-[160px]"}`}
        >
          {menuContent}
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

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || "";
};

const getProfileUrl = (path: string | undefined): string => {
  if (!path || path.trim() === "") return "";
  if (path.startsWith("http")) return path;

  let normalizedPath = path.replace(/\\/g, "/").trim();
  normalizedPath = normalizedPath.replace(/^\d+\s+/, "");
  normalizedPath = normalizedPath.replace(/^\/+/, "");

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

export function AttachmentPreviewItem({
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
    isImage ? URL.createObjectURL(file) : null,
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
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="truncate block" title={file.name}>
            {file.name}
          </span>
          <span className="text-xs text-[#8B8B8B]">
            {formatFileSize(file.size)}
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-0.5 rounded text-black hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
        aria-label={`Remove ${file.name}`}
      >
        <svg
          className="w-4 h-4"
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
    </li>
  );
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
  projectid?: number;
  created_at?: string;
  Actual_start_time?: string;
  source?: "In House" | "Outsource";
}

/** Map task (local or API shape) to form values so every detail shows in edit. */
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
    const s = str(v);
    if (s.length >= 10) return s.slice(0, 10);
    return s;
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
      t.assigned_full_name ?? t.assign_to ?? t.assignTo ?? t.assigned_to ?? "",
    ),
    description: str(t.description ?? ""),
    checklist: str(t.checklist ?? ""),
  };
}

function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return "—";
  const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  const fmtShort = (s: string) => {
    const d = new Date(s);
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };
  const fmtFull = (s: string) => {
    const d = new Date(s);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  if (start && end) return `${fmtShort(start)} - ${fmtFull(end)}`;
  if (start) return fmtFull(start);
  return end ? fmtFull(end) : "—";
}

function normalizeStatus(
  s: string | undefined,
  approval?: string,
): "todo" | "in_progress" | "completed" | "approved" | "rejected" {
  if (approval?.toLowerCase() === "approved") return "approved";
  if (approval?.toLowerCase() === "rejected") return "rejected";
  if (!s) return "todo";
  const lower = s.toLowerCase().replace(/\s+/g, "_");
  if (lower.includes("progress") || lower === "in_progress")
    return "in_progress";
  if (lower.includes("complete") || lower === "done") return "completed";
  return "todo";
}

const STATUS_STYLE: Record<
  "todo" | "in_progress" | "completed" | "approved" | "rejected",
  { label: string; dot: string; bg: string }
> = {
  todo: {
    label: "To Do",
    dot: "bg-orange-500",
    bg: "bg-orange-100 text-orange-800 rounded-full",
  },
  in_progress: {
    label: "In Progress",
    dot: "bg-sky-500",
    bg: "bg-sky-100 text-sky-800",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    bg: "bg-emerald-100 text-emerald-800",
  },
  approved: {
    label: "Approved",
    dot: "bg-emerald-500",
    bg: "bg-emerald-100 text-emerald-800 rounded-full",
  },
  rejected: {
    label: "Rejected",
    dot: "bg-red-500",
    bg: "bg-red-100 text-red-800 rounded-full",
  },
};

export function TaskCard({
  task,
  status,
  onViewTask,
  onEditTask,
  onDeleteTask,
}: {
  task: Task;
  status: "todo" | "in_progress" | "completed" | "approved" | "rejected";
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
  const isUnderReview = isReviewTask && task.Approval?.toLowerCase() !== "approved";
  const isReviewed = isReviewTask && task.Approval?.toLowerCase() === "approved";
  const progress =
    status === "todo"
      ? 0
      : status === "in_progress"
        ? 50
        : isReviewed
          ? 100
          : typeof task.progress === "number"
            ? task.progress
            : 100;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isCompleted = status === "completed";

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

  const dateOnly = (v: string | undefined): string => {
    if (!v) return "—";
    const d = new Date(v);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const startStr = dateOnly(task.start_date || task.Actual_start_time);
  const endStr = dateOnly(task.due_date);

  return (
    <div
      draggable={!isCompleted}
      onDragStart={handleDragStart}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm relative ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <h4 className="font-medium text-[#353535] text-[20px] truncate">
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
            className="rounded cursor-pointer"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <img src={threedot} alt="Dot" className="w-4 h-4 text-[#8B8B8B]" />
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

            </div>
          )}
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex flex-col">
          <span className="text-[14px] font-medium text-[#000000]">
            Start Date
          </span>
          <span className="text-[14px] font-medium text-[#8B8B8B]">
            {startStr}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[14px] font-medium text-[#000000]">
            End Date
          </span>
          <span className="text-[14px] font-medium text-[#8B8B8B]">
            {endStr}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mb-1 text-[12px] text-[#8B8B8B]">
        <span>Progress</span>
        <span className="font-medium">
          {isReviewTask && !isReviewed
            ? `${progress}% (Under Review)`
            : isReviewed
              ? `100% (Reviewed)`
              : isUnderReview
                ? `95% (Under Review)`
                : `${progress}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-[#8B8B8B] transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            {/* Assigned To Profile */}
            <div
              className="w-7 h-7 rounded-full border-2 border-white bg-[#F0F0F0] flex items-center justify-center overflow-hidden shrink-0"
              title={`Assigned to: ${task.assigned_full_name || "Unassigned"}`}
            >
              {task.assigned_profile_picture ? (
                <img
                  src={getGlobalProfileUrl(
                    task.assigned_to,
                    task.assigned_profile_picture,
                  )}
                  alt="Assignee"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getProfileUrl(task.assigned_profile_picture);
                    target.onerror = () => {
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        const span = document.createElement("span");
                        span.className = "text-[10px] font-bold text-[#DD4342]";
                        span.innerText = (task.assigned_full_name || "U")
                          .charAt(0)
                          .toUpperCase();
                        parent.appendChild(span);
                      }
                    };
                  }}
                />
              ) : (
                <span className="text-[10px] font-bold text-[#DD4342]">
                  {(task.assigned_full_name || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Uploader Profile */}
            <div
              className="w-7 h-7 rounded-full border-2 border-white bg-[#F0F0F0] flex items-center justify-center overflow-hidden shrink-0"
              title={`Assigned by: ${task.uploader_full_name || "System"}`}
            >
              {task.uploader_profile_picture ? (
                <img
                  src={getGlobalProfileUrl(
                    task.uploaderid,
                    task.uploader_profile_picture,
                  )}
                  alt="Uploader"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getProfileUrl(task.uploader_profile_picture);
                    target.onerror = () => {
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        const span = document.createElement("span");
                        span.className = "text-[10px] font-bold text-[#DD4342]";
                        span.innerText = (task.uploader_full_name || "S")
                          .charAt(0)
                          .toUpperCase();
                        parent.appendChild(span);
                      }
                    };
                  }}
                />
              ) : (
                <span className="text-[10px] font-bold text-[#DD4342]">
                  {(task.uploader_full_name || "S").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          draggable={false}
          onClick={() => onViewTask?.(task)}
          className="group inline-flex items-center text-[14px] font-medium text-[#8B8B8B] hover:text-[#353535] gap-2 cursor-pointer transition-colors"
        >
          Details
          <img
            src={Arrow}
            alt="Arrow"
            className="w-2.5 h-2.5 transition-all duration-200 group-hover:translate-x-0.5 group-hover:brightness-0 group-hover:invert-[20%]"
          />
        </button>
      </div>
    </div>
  );
}

const getEffectiveStatus = (
  task: Task,
): "todo" | "in_progress" | "completed" => {
  const s = normalizeStatus(task.status, task.Approval);
  if (s === "todo") return "todo";
  if (s === "in_progress") return "in_progress";
  return "completed";
};

const SHOW_OPTIONS = ["Show Entries", "1-10", "1-50", "1-100", "All"];
const PERIOD_OPTIONS = [
  "Period",
  "Show All",
  "This Week",
  "This Month",
  "This Quarter",
];

export default function MytaskBC() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const { user } = useAuth();
  // `/bc/mytasks` only — never use team task API here.
  const isTeam = false;
  const statusFilter =
    searchParams.get("status") || searchParams.get("taskstatus");
  const [list, setList] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string | null>(
    "Show Entries",
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  const employeeOptions = useMemo(() => {
    const raw = Array.isArray(employees) ? employees : [];
    const baseOptions = ["Select Employee", "Show All"];

    if (
      !selectedProject ||
      selectedProject === "Select Projects" ||
      selectedProject === "Show All"
    ) {
      return [...baseOptions, ...raw.map((e) => e.full_name)];
    }

    const proj = projects.find((p) => p.project_name === selectedProject);
    if (!proj) {
      return [...baseOptions, ...raw.map((e) => e.full_name)];
    }

    const memberTokens = (proj.members || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const filtered = raw.filter((emp) => {
      const name = (emp.full_name || "").trim();
      const idStr = String(emp.id);
      return memberTokens.some(
        (t) => t === idStr || t.toLowerCase() === name.toLowerCase(),
      );
    });

    return [...baseOptions, ...filtered.map((e) => e.full_name)];
  }, [employees, projects, selectedProject]);
  const projectOptions = [
    "Select Projects",
    ...projects.filter((p) => p.source !== "Outsource").map((p) => p.project_name),
  ];

  const statusToLabel = (
    s: "todo" | "in_progress" | "completed" | "approved" | "rejected",
  ): string => {
    if (s === "todo") return "To Do";
    if (s === "in_progress") return "In Progress";
    if (s === "completed") return "Completed";
    if (s === "approved") return "Approved";
    return "Rejected";
  };

  const handleMoveTask = async (
    taskId: number,
    newStatus: "todo" | "in_progress" | "completed",
  ) => {
    try {
      const statusMap = {
        todo: "Todo",
        in_progress: "InProgress",
        completed: "Completed",
      };

      const task = list.find((t) => t.id === taskId);
      if (task) {
        const bucket = getEffectiveStatus(task);
        if (bucket === "todo" && newStatus === "completed") {
          toast.error(
            "Move the task to In Progress before marking it completed.",
          );
          return;
        }
        if (bucket === "completed" && newStatus !== "completed") {
          toast.error("Completed tasks cannot be moved.");
          return;
        }
      }
      const projectId = (task as any)?.projectid ?? (task as any)?.project_id;

      const isOutsource = task?.source === "Outsource";
      const endpoint = isOutsource
        ? `/api/vendors/vendor-tasks/${taskId}/status`
        : `/api/tasks/${taskId}/status`;

      await api.patch(endpoint, {
        status: statusMap[newStatus],
        projectId,
      });
      setList((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
              ...t,
              status: statusMap[newStatus],
              Approval:
                newStatus === "completed" && String(t.uploaderid) === String(user?.id)
                  ? "Approved"
                  : t.Approval,
            }
            : t,
        ),
      );
    } catch (error) {
      console.error("Error moving task:", error);
    }
  };

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

  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [attachmentPreviewFile, setAttachmentPreviewFile] =
    useState<File | null>(null);
  const navigate = useNavigate();

  const openEditTask = (task: Task) => {
    navigate("/bc/mytasks/add", { state: { task } });
  };

  const openDeleteTask = (task: Task) => {
    setDeleteTask(task);
  };

  const openViewTask = (task: Task) => {
    const sourceQuery = task.source === "Outsource" ? "?source=Outsource" : "";
    navigate(`/bc/mytasks/view/${task.id}${sourceQuery}`, { state: { task, from: "mytasks" } });
  };

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

  useEffect(() => {
    api
      .get<{ employees: Employee[] }>("/api/employees")
      .then((res) =>
        setEmployees(
          (res.data.employees || []).filter(
            isEmployeeActiveForProjectAssignment,
          ),
        ),
      );

    Promise.all([
      api.get<{ projects: Project[] }>("/api/projects"),
      api.get<{ projects: Project[] }>("/api/vendors/vendor-projects"),
    ]).then(([res1, res2]) => {
      const p1 = (res1.data.projects || []).map((p) => ({
        ...p,
        source: "In House",
      }));
      const p2 = (res2.data.projects || []).map((p) => ({
        ...p,
        source: "Outsource",
      }));
      setProjects([...p1, ...p2] as Project[]);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (isTeam) {
      params.condition = "1";
      params.employeeid = "all";
    }

    const taskParams: Record<string, string> = { ...params };
    let cancelled = false;

    (async () => {
      const t1: Task[] = [];
      const t2: Task[] = [];
      try {
        const res1 = await api.get<{ tasks?: Task[] }>("/api/tasks", {
          params: taskParams,
        });
        if (!cancelled) {
          t1.push(
            ...(res1.data.tasks ?? []).map((t) => ({
              ...t,
              source: "In House" as const,
            })),
          );
        }
      } catch (err) {
        console.error("In-house tasks fetch failed:", err);
        if (!cancelled) {
          toast.error(
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Could not load in-house tasks.",
            { id: "bc-mytasks-inhouse" },
          );
        }
      }
      try {
        const res2 = await api.get<{ tasks?: Task[] }>(
          "/api/vendors/vendor-tasks",
          { params: taskParams },
        );
        if (!cancelled) {
          t2.push(
            ...(res2.data.tasks ?? []).map((t) => ({
              ...t,
              source: "Outsource" as const,
            })),
          );
        }
      } catch (err) {
        console.error("Outsource tasks fetch failed:", err);
        if (!cancelled) {
          toast.error(
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Could not load outsource tasks.",
            { id: "bc-mytasks-outsource" },
          );
        }
      }
      if (!cancelled) {
        const combined = [...t1, ...t2] as Task[];
        combined.sort((a, b) => {
          const dateA = new Date(a.created_at || a.start_date || 0).getTime();
          const dateB = new Date(b.created_at || b.start_date || 0).getTime();
          if (dateB !== dateA) return dateB - dateA;
          return (b.id || 0) - (a.id || 0);
        });
        setList(combined);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isTeam, statusFilter]);

  const confirmDeleteTask = async () => {
    if (deleteTask === null) return;
    try {
      const isOutsource = deleteTask.source === "Outsource";
      const endpoint = isOutsource
        ? `/api/vendors/vendor-tasks/${deleteTask.id}`
        : `/api/tasks/${deleteTask.id}`;

      await api.delete(endpoint);
      setList((prev) => prev.filter((t) => t.id !== deleteTask.id));
      setDeleteTask(null);
      toast.error("Deleted successfully");
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const searchQuery = searchParams.get("q")?.toLowerCase() || "";
  const allTasks = list.filter((t) => {
    // Search filter
    if (searchQuery) {
      const matches =
        (t.task_name || "").toLowerCase().includes(searchQuery) ||
        (t.project_name || "").toLowerCase().includes(searchQuery) ||
        (t.assigned_full_name || t.assign_to || "")
          .toLowerCase()
          .includes(searchQuery) ||
        (t.module || "").toLowerCase().includes(searchQuery);
      if (!matches) return false;
    }

    // Employee filter
    if (
      selectedEmployee &&
      !["Select Employee", "Show All", "Employee"].includes(selectedEmployee)
    ) {
      if (t.assigned_full_name !== selectedEmployee) return false;
    }
    // Project filter
    if (
      selectedProject &&
      !["Select Projects", "Show All", "Projects"].includes(selectedProject)
    ) {
      if (t.project_name !== selectedProject) return false;
    }
    // Period filter
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

  const tasksByStatus = {
    todo: allTasks.filter((t) => getEffectiveStatus(t) === "todo"),
    in_progress: allTasks.filter(
      (t) => getEffectiveStatus(t) === "in_progress",
    ),
    completed: allTasks.filter((t) => getEffectiveStatus(t) === "completed"),
  };

  let limitStart = 0;
  let limitEnd = 50;
  if (selectedShow === "All") {
    limitStart = 0;
    limitEnd = Infinity;
  } else if (selectedShow && selectedShow !== "Show Entries") {
    const parts = selectedShow.split("-");
    if (parts.length === 2) {
      limitStart = parseInt(parts[0], 10) - 1;
      limitEnd = parseInt(parts[1], 10);
    }
  }

  const displayedTasksByStatus = {
    todo: tasksByStatus.todo.slice(limitStart, limitEnd),
    in_progress: tasksByStatus.in_progress.slice(limitStart, limitEnd),
    completed: tasksByStatus.completed.slice(limitStart, limitEnd),
  };

  const counts = {
    todo: tasksByStatus.todo.length,
    in_progress: tasksByStatus.in_progress.length,
    completed: tasksByStatus.completed.length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="bg-white px-5 py-2 flex-shrink-0">
        {/* Top row: title + dropdowns + Add task */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <h2 className="text-[24px] font-semibold text-slate-800 font-Gantari">
            {isTeam ? "Team Task" : "My Task"}
          </h2>
          <div
            ref={dropdownsContainerRef}
            className="flex flex-wrap items-center gap-2 w-fit"
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
            <div className="w-[130px]">
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
                maxVisibleItems={4}
              />
            </div>
            <div className="w-[130px]">
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
            </div>
            <button
              type="button"
              onClick={() => navigate("/bc/mytasks/add")}
              className="inline-flex items-center gap-2 rounded-md bg-[#DD4342] px-4 py-2 text-[14px] font-medium text-[#F2F2F2] shadow-sm cursor-pointer"
            >
              Add task
            </button>
          </div>
        </div>{" "}
        {/* Status summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <Link
            to={statusFilter === "todo" ? pathname : `${pathname}?status=todo`}
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "todo" ? "bg-orange-50 border-orange-300 ring-1 ring-orange-300" : "bg-white border-slate-200"}`}
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
                : `${pathname}?status=in_progress`
            }
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200"}`}
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
                : `${pathname}?status=completed`
            }
            className={`flex p-4 gap-4 rounded-xl border py-4 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "completed" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-white border-slate-200"}`}
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

      {/* Task columns scrollable area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 py-2">
          <div
            className="space-y-2 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors"
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
            className="min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors"
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

      {/* Delete Task confirmation modal */}
      {deleteTask !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
            {/* Close */}
            <button
              type="button"
              onClick={() => setDeleteTask(null)}
              className="absolute left-4 top-4 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer group"
            >
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                  <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                    Close
                  </span>
                </div>
              </div>
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

      <AttachmentPreviewModal
        file={attachmentPreviewFile}
        onClose={() => setAttachmentPreviewFile(null)}
      />
    </div>
  );
}
