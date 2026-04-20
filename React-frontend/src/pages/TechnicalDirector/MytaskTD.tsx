import { useEffect, useState, useRef, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
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
import { useAuth } from "../../contexts/AuthContext";

type DropdownId = "employee" | "projects" | "period" | null;
export type FormDropdownId =
  | "project"
  | "module"
  | "type"
  | "assignTo"
  | "type_start_time"
  | "type_end_time"
  | null;

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

export function formatTimeForDisplay(value: string): string {
  if (!value || !value.match(/^\d{1,2}:\d{2}$/)) return "--:--";
  const [hStr, mStr] = value.split(":");
  const h24 = parseInt(hStr, 10);
  const m = mStr || "00";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? "AM" : "PM";
  return `${h12}:${m} ${ampm}`;
}

/** Formats YYYY-MM-DD or ISO string to DD/MM/YYYY for display. */
export function formatDateForDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const datePart = value.includes("T") ? value.split("T")[0] : value;
  const parts = datePart.split("-");
  if (parts.length !== 3) return value;
  const [y, m, d] = parts;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

export interface Employee {
  id: number;
  full_name: string;
  active?: string | null;
}

export interface Project {
  id: number;
  project_name: string;
  modules?: string;
  tasks?: string;
  members_names?: string[];
  project_manager_name?: string;
  lead_name?: string;
  bim_coordinator_name?: string;
  uploader_name?: string;
  members?: string;
  source?: string;
}

export interface FormDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** Root element for outside-click checks; assign to wrapper that contains trigger + menu. */
  triggerRef: React.RefObject<HTMLElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  searchable?: boolean;
  /** Max option rows visible before scroll. Default 4. */
  maxVisibleRows?: number;
  bgClass?: string;
  fontClass?: string;
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
  maxVisibleRows = 4,
  bgClass = "bg-[#E8E8E8]",
  fontClass = "font-semibold",
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

  const listMaxHeightPx = Math.max(120, maxVisibleRows * 40 + 8);

  const displayLabel = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : label;

  useEffect(() => {
    if (isOpen && searchable) setSearchQuery("");
  }, [isOpen, searchable]);

  const setRootRef = (node: HTMLDivElement | null) => {
    (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
  };

  const fieldShellClass = `flex w-full items-center gap-2 rounded-md border border-transparent ${bgClass} px-3 py-1.5 sm:py-2 text-left text-[14px] ${fontClass} font-Gantari transition-colors focus-within:border-[#AEACAC52]`;

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
            style={{ maxHeight: listMaxHeightPx }}
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

export interface TaskDropdownProps {
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
  /** `right`: anchor menu to trigger’s right edge (e.g. task picker beside full-width input). */
  menuAlign?: "left" | "right";
  /** Fixed layer + portal so the menu isn’t clipped by `overflow-y-auto` ancestors (e.g. add-task form). */
  menuUseFixedLayer?: boolean;
  /** Right segment of a compound field (same bar as text input); matches Attachments “Browse” styling. */
  triggerVariant?: "default" | "compositeEnd";
  bgClass?: string;
  fontClass?: string;
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
  menuAlign = "left",
  menuUseFixedLayer = false,
  triggerVariant = "default",
  bgClass = "bg-[#E8E8E8]",
  fontClass = "font-semibold",
}: TaskDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [fixedPlacement, setFixedPlacement] = useState<{
    top: number;
    right?: number;
    left?: number;
    maxH: number;
    maxW: number;
    minW: number;
  } | null>(null);
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

  const positionClass = narrow
    ? "right-0 min-w-[110px]"
    : menuAlign === "right"
      ? "right-0 min-w-[200px] max-w-[min(calc(100vw-1rem),320px)]"
      : "left-0 min-w-[160px] max-w-[min(calc(100vw-1rem),320px)]";

  useLayoutEffect(() => {
    if (!isOpen || !menuUseFixedLayer || !triggerRef.current) {
      setFixedPlacement(null);
      return;
    }
    const el = triggerRef.current;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 4;
      const minW = narrow ? 110 : 200;
      const maxW = Math.min(320, vw - 16);
      const searchH = searchable ? 56 : 0;
      const listCap = maxVisibleItems * 40 + 16;
      const maxH = Math.min(
        listCap + searchH,
        Math.max(120, vh - r.bottom - gap - 12),
        320,
      );
      if (narrow || menuAlign === "right") {
        setFixedPlacement({
          top: r.bottom + gap,
          right: vw - r.right,
          maxH,
          maxW,
          minW,
        });
      } else {
        setFixedPlacement({
          top: r.bottom + gap,
          left: Math.max(8, Math.min(r.left, vw - maxW - 8)),
          maxH,
          maxW,
          minW,
        });
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [
    isOpen,
    menuUseFixedLayer,
    menuAlign,
    narrow,
    maxVisibleItems,
    searchable,
  ]);

  const menuShellClass =
    "flex flex-col overflow-hidden rounded-md border border-[#E0E0E0] bg-white shadow-lg";

  const triggerButtonClass =
    triggerVariant === "compositeEnd"
      ? "inline-flex h-full min-h-[40px] w-auto shrink-0 items-center justify-between gap-2 border-0 border-l border-[#E0E0E0] bg-[#E2E2E2] px-4 py-2 text-[14px] font-Gantari text-[#8B8B8B] cursor-pointer outline-none transition-colors hover:bg-[#dadada] focus-visible:bg-[#dadada]"
      : `inline-flex items-center justify-between rounded-md border border-transparent ${bgClass} px-4 py-1.5 sm:py-2 text-[14px] ${fontClass} font-Gantari cursor-pointer ${narrow ? "min-w-[90px]" : "min-w-[140px]"}`;

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
    <div
      className={
        triggerVariant === "compositeEnd"
          ? "relative flex h-full min-h-0 shrink-0 self-stretch"
          : "relative"
      }
    >
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
          {label.toLowerCase() === "show" && selected && selected !== label ? (
            <>
              <span className="text-[14px]">{label}:</span>{" "}
              <span className="font-semibold">{selected}</span>
            </>
          ) : (
            selected || label
          )}
        </span>
        <img
          src={ArrowDown}
          alt="arrow"
          className={`ml-2 w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            } ${!(selected && selected !== label)
              ? "opacity-60 grayscale"
              : "opacity-90"
            }`}
        />
      </button>
      {isOpen &&
        (menuUseFixedLayer ? (
          fixedPlacement &&
          createPortal(
            <div
              ref={dropdownRef}
              role="listbox"
              className={`${menuShellClass} fixed z-[9999]`}
              style={{
                top: fixedPlacement.top,
                ...(fixedPlacement.right !== undefined
                  ? { right: fixedPlacement.right }
                  : { left: fixedPlacement.left }),
                minWidth: fixedPlacement.minW,
                maxWidth: fixedPlacement.maxW,
                maxHeight: fixedPlacement.maxH,
              }}
            >
              {menuContent}
            </div>,
            document.body,
          )
        ) : (
          <div
            ref={dropdownRef}
            role="listbox"
            className={`absolute top-full z-50 mt-1 flex max-h-[min(18rem,calc(100vh-7rem))] ${menuShellClass} ${positionClass}`}
          >
            {menuContent}
          </div>
        ))}
    </div>
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

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
    <li className="flex items-center gap-3 rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#101827]">
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
  projectid?: number;
  project_id?: number;
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
  review_remark?: string;
  assigned_full_name?: string;
  uploader_full_name?: string;
  assigned_to?: number;
  uploaderid?: number;
  assigned_profile_picture?: string;
  uploader_profile_picture?: string;
  created_at?: string;
  Approval?: string;
  Actual_start_time?: string;
  perferstart_time?: string;
  perferend_time?: string;
  source?: "In House" | "Outsource";
  /** Comma-separated stored filenames under /uploads/task/ (from POST .../output-files). */
  outputfilepath?: string;
}

/** Map task (local or API shape) to form values so every detail shows in edit. */
export function taskToFormValues(task: Task | Record<string, unknown>): {
  projectName: string;
  module: string;
  taskName: string;
  type: string;
  startDate: string;
  endDate: string;
  actualStartDate: string;
  actualEndDate: string;
  startTime: string;
  dueTime: string;
  assignTo: string;
  description: string;
  checklist: string;
  reviewRemark: string;
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
  const startDate = dateOnly(
    t.start_date ?? t.startDate ?? t.Actual_start_time ?? "",
  );
  const endDate = dateOnly(t.due_date ?? t.dueDate ?? "");
  return {
    projectName: str(t.project_name ?? t.projectName ?? ""),
    module: str(t.module ?? t.modules_name ?? t.modules ?? ""),
    taskName: str(t.task_name ?? t.taskName ?? ""),
    type: str(t.type ?? t.category ?? ""),
    startDate,
    endDate,
    actualStartDate: startDate,
    actualEndDate: endDate,
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
    // Prefer human-readable assignee; never show raw employee id as the dropdown value.
    assignTo: (() => {
      const fromName = str(
        t.assigned_full_name ?? t.assign_to ?? t.assignTo ?? "",
      ).trim();
      if (fromName) return fromName;
      const idStr = str(t.assigned_to ?? "").trim();
      if (idStr && !/^\d+$/.test(idStr)) return idStr;
      return "";
    })(),
    description: str(t.description ?? ""),
    checklist: str(t.checklist ?? ""),
    reviewRemark: str(t.review_remark ?? t.reviewRemark ?? ""),
  };
}

function normalizeStatus(
  s: string | undefined,
): "todo" | "in_progress" | "completed" {
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
  const progress =
    status === "completed" &&
    task.assigned_to != null &&
    task.uploaderid != null &&
    String(task.assigned_to) !== String(task.uploaderid)
      ? 95
      : typeof task.progress === "number"
        ? task.progress
        : status === "todo"
          ? 0
          : status === "in_progress"
            ? 50
            : 100;
  const isUnderReview =
    status === "completed" &&
    task.assigned_to != null &&
    task.uploaderid != null &&
    String(task.assigned_to) !== String(task.uploaderid);
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
      className={`mt-2 rounded-lg border border-[#AEACAC52] bg-white p-3 shadow-sm relative mx-auto w-full max-w-full lg:max-w-none ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
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
                className="flex w-full items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
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
                    className="flex w-full items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
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
                    className="flex w-full items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
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
          {isUnderReview ? "95% (Under Review)" : `${progress}%`}
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
const PERIOD_OPTIONS = [
  "Period",
  "This Week",
  "This Month",
  "This Quarter",
  "Custom",
];

export default function MytaskTD() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isTeam =
    searchParams.get("condition") === "1" || pathname.endsWith("/team");
  const statusFilter =
    searchParams.get("status") || searchParams.get("taskstatus");
  const STORAGE_KEY = "td_myTask_localTasks";
  const DELETED_IDS_KEY = "td_myTask_deletedIds";
  const STATUS_OVERRIDES_KEY = "td_myTask_statusOverrides";
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
  const loadStatusOverrides = (): Record<number, string> => {
    try {
      const raw = localStorage.getItem(STATUS_OVERRIDES_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const out: Record<number, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          const id = Number(k);
          if (!Number.isNaN(id) && typeof v === "string") out[id] = v;
        }
        return out;
      }
      return {};
    } catch {
      return {};
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
  const [statusOverrides, setStatusOverrides] =
    useState<Record<number, string>>(loadStatusOverrides);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const safeLocal = Array.isArray(localTasks) ? localTasks.filter(Boolean) : [];
  const safeList = Array.isArray(list) ? list.filter(Boolean) : [];
  const merged = [
    ...safeLocal,
    ...safeList.filter((t) => t && !safeLocal.some((l) => l && l.id === t.id)),
  ];

  const allTasksBase = merged.filter(
    (t) => t && t.id != null && !deletedIds.includes(t.id),
  );
  const allTasks = allTasksBase.filter((t) => {
    // Search Filter
    const searchQuery = searchParams.get("q")?.toLowerCase() || "";
    if (searchQuery) {
      const matchesSearch =
        (t.task_name || "").toLowerCase().includes(searchQuery) ||
        (t.project_name || "").toLowerCase().includes(searchQuery) ||
        (t.assigned_full_name || t.assign_to || "")
          .toLowerCase()
          .includes(searchQuery) ||
        (t.module || "").toLowerCase().includes(searchQuery) ||
        (t.type || "").toLowerCase().includes(searchQuery);
      if (!matchesSearch) return false;
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

  const getEffectiveStatus = (t: Task): "todo" | "in_progress" | "completed" =>
    normalizeStatus(statusOverrides[t.id] ?? t.status);

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
    const task =
      list.find((t) => t.id === taskId) ??
      safeLocal.find((t) => t.id === taskId);
    if (!task) return;

    const current = normalizeStatus(statusOverrides[taskId] ?? task.status);
    if (current === "todo" && newStatus === "completed") {
      toast.error("Move the task to In Progress before marking it completed.");
      return;
    }
    if (current === "completed" && newStatus !== "completed") {
      toast.error("Completed tasks cannot be moved.");
      return;
    }

    const label = statusToLabel(newStatus);
    setStatusOverrides((prev) => ({ ...prev, [taskId]: label }));

    const statusMap = {
      todo: "Todo",
      in_progress: "InProgress",
      completed: "Completed",
    };

    setList((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: statusMap[newStatus] } : t,
      ),
    );
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: label } : t)),
    );

    const isOutsource = task?.source === "Outsource";
    const endpoint = isOutsource
      ? `/api/vendors/vendor-tasks/${taskId}/status`
      : `/api/tasks/${taskId}/status`;

    const projectId = (task as any)?.projectid ?? (task as any)?.project_id;

    api
      .patch(endpoint, {
        status: newStatus.replace("_", ""),
        projectId,
      })
      .then(() => {
        setSuccessMsg("Updated successfully");
        setTimeout(() => setSuccessMsg(""), 3000);
      })
      .catch((err) => {
        console.error("Failed to update task status:", err);
      });
  };

  useEffect(() => {
    try {
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(deletedIds));
    } catch {
      // ignore
    }
  }, [deletedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STATUS_OVERRIDES_KEY,
        JSON.stringify(statusOverrides),
      );
    } catch {
      // ignore
    }
  }, [statusOverrides]);

  const navigate = useNavigate();

  const openEditTask = (task: Task) => {
    navigate("/td/mytasks/add", { state: { task, from: "mytasks" } });
  };

  const openDeleteTask = (task: Task) => {
    setDeleteTask(task);
  };

  const openViewTask = (task: Task) => {
    navigate("/td/mytasks/view", { state: { task, from: "mytasks" } });
  };

  const confirmDeleteTask = () => {
    if (deleteTask !== null) {
      const isOutsource = deleteTask.source === "Outsource";
      const endpoint = isOutsource
        ? `/api/vendors/vendor-tasks/${deleteTask.id}`
        : `/api/tasks/${deleteTask.id}`;

      api
        .delete(endpoint)
        .then(() => {
          setList((prev) => prev.filter((t) => t.id !== deleteTask.id));
          setLocalTasks((prev) => prev.filter((t) => t.id !== deleteTask.id));
          setDeletedIds((prev) => [...prev, deleteTask.id]);
          setDeleteTask(null);
          toast.success("Task Deleted Successfully");
        })
        .catch(() => {
          setDeleteTask(null);
        });
    }
  };

  const dropdownsContainerRef = useRef<HTMLDivElement>(null);
  const employeeTriggerRef = useRef<HTMLButtonElement>(null);
  const employeeMenuRef = useRef<HTMLDivElement>(null);
  const projectsTriggerRef = useRef<HTMLButtonElement>(null);
  const projectsMenuRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);
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
    if (openDropdown !== null) setShowEntriesOpen(false);
  }, [openDropdown]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        showEntriesOpen &&
        showEntriesDropdownRef.current &&
        !showEntriesDropdownRef.current.contains(t)
      ) {
        setShowEntriesOpen(false);
      }
    };
    if (showEntriesOpen) {
      document.addEventListener("mousedown", handleMouseDown);
      return () => document.removeEventListener("mousedown", handleMouseDown);
    }
  }, [showEntriesOpen]);

  useEffect(() => {
    if (showEntriesOpen && showEntriesDropdownContentRef.current) {
      showEntriesDropdownContentRef.current.scrollTop = 0;
    }
  }, [showEntriesOpen]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (isTeam) {
      params.condition = "1";
      params.employeeid = "all";
    }

    const taskParams: Record<string, string> = { ...params };

    Promise.all([
      api.get<{ tasks?: Task[] }>("/api/tasks", { params: taskParams }),
      api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks", {
        params: taskParams,
      }),
      api.get<{ employees?: Employee[] }>("/api/employees"),
      api.get<{ projects?: Project[] }>("/api/projects"),
      api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
    ])
      .then(([tasksRes, vTasksRes, empRes, projRes, vProjRes]) => {
        const internalTasks = (tasksRes.data.tasks ?? []).map((t) => ({
          ...t,
          source: "In House",
        }));
        const vendorTasks = (vTasksRes.data.tasks ?? []).map((t) => ({
          ...t,
          source: "Outsource",
        }));
        setList([...internalTasks, ...vendorTasks] as Task[]);

        setEmployees(
          (empRes.data.employees ?? []).filter(
            isEmployeeActiveForProjectAssignment,
          ),
        );

        const internalProjs = (projRes.data.projects ?? []).map((p) => ({
          ...p,
          source: "In House",
        }));
        const vendorProjs = (vProjRes.data.projects ?? []).map((p) => ({
          ...p,
          source: "Outsource",
        }));
        setProjects([...internalProjs, ...vendorProjs] as Project[]);
      })
      .catch(() => {
        setList([]);
      })
      .finally(() => setLoading(false));
  }, [isTeam, statusFilter]);

  const employeeOptions = useMemo(() => {
    const raw = Array.isArray(employees) ? employees : [];
    const baseOptions = ["Select Employee", "Show All"];

    if (
      !selectedProject ||
      selectedProject === "Select Projects" ||
      selectedProject === "Show All" ||
      selectedProject === "Projects"
    ) {
      return [...baseOptions, ...raw.map((e) => e.full_name).filter(Boolean)];
    }

    const proj = projects.find((p) => p.project_name === selectedProject);
    if (!proj) {
      return [...baseOptions, ...raw.map((e) => e.full_name).filter(Boolean)];
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

    const selfById =
      user?.id != null ? raw.find((e) => e.id === user.id) : undefined;
    const selfEmp =
      selfById ??
      (user?.full_name
        ? raw.find(
          (e) =>
            (e.full_name || "").trim().toLowerCase() ===
            user.full_name.trim().toLowerCase(),
        )
        : undefined);
    const withSelf =
      selfEmp && !filtered.some((e) => e.id === selfEmp.id)
        ? [...filtered, selfEmp]
        : filtered;

    return [...baseOptions, ...withSelf.map((e) => e.full_name)];
  }, [employees, projects, selectedProject, user]);

  const projectOptions = [
    "Select Projects",
    ...(Array.isArray(projects) ? projects : [])
      .map((p) => p?.project_name)
      .filter(Boolean),
  ];

  const tasksByStatus = {
    todo: allTasks.filter((t) => getEffectiveStatus(t) === "todo"),
    in_progress: allTasks.filter(
      (t) => getEffectiveStatus(t) === "in_progress",
    ),
    completed: allTasks.filter((t) => getEffectiveStatus(t) === "completed"),
  };

  const effectiveShowEntryValue =
    selectedShowEntries || showEntriesOptions[0].value;
  const selectedShowRange =
    showEntriesOptions.find((opt) => opt.value === effectiveShowEntryValue) ??
    showEntriesOptions[0];
  const sliceForShowEntries = <T,>(arr: T[]): T[] => {
    const rangeEnd =
      selectedShowRange.end === null
        ? arr.length
        : Math.min(selectedShowRange.end, arr.length);
    return arr.slice(selectedShowRange.start, rangeEnd);
  };

  const displayedTasksByStatus = {
    todo: sliceForShowEntries(tasksByStatus.todo),
    in_progress: sliceForShowEntries(tasksByStatus.in_progress),
    completed: sliceForShowEntries(tasksByStatus.completed),
  };

  const counts = {
    todo: displayedTasksByStatus.todo.length,
    in_progress: displayedTasksByStatus.in_progress.length,
    completed: displayedTasksByStatus.completed.length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden bg-white custom-scrollbar relative">
      <div className="bg-white flex-shrink-0 px-5 pt-0 sm:pt-0 sm:mt-2">
        {/* Row 1: Title and Add Task button for mobile only (hidden on lg) */}
        <div className="flex flex-row items-center justify-between w-full mb-4 lg:hidden">
          <h2 className="text-[20px] sm:text-[24px] font-semibold text-slate-800 font-Gantari">
            {isTeam ? "Team Task" : "My Task"}
          </h2>
          <button
            type="button"
            onClick={() => navigate("/td/mytasks/add")}
            className="sm:hidden inline-flex items-center justify-center gap-2 rounded-md bg-[#DD4342] px-2 py-1.5 text-[14px] font-medium text-[#F2F2F2] shadow-sm cursor-pointer whitespace-nowrap active:scale-[0.98] transition-all"
          >
            <img src={AddBtn} alt="Add" className="h-4 w-4" />
            Add task
          </button>
        </div>

        {/* Row 2: Title (LG only) + Filters + Desktop Add Task button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <h2 className="hidden lg:block text-[24px] font-semibold text-slate-800 font-Gantari">
            {isTeam ? "Team Task" : "My Task"}
          </h2>
          <div
            ref={dropdownsContainerRef}
            className="grid grid-cols-2 lg:flex lg:flex-row lg:items-center gap-2.5 w-full lg:w-auto"
          >
            <div className="w-full lg:w-auto">
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
            </div>
            <div className="w-full lg:w-auto">
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
            </div>

            <div
              className="relative w-full lg:w-[150px]"
              ref={showEntriesDropdownRef}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(null);
                  setShowEntriesOpen((o) => !o);
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 sm:py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-Gantari transition-all cursor-pointer border-0 min-w-0"
              >
                <span
                  className={`min-w-0 flex-1 truncate overflow-hidden text-left ${
                    selectedShowEntries === ""
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
                        {selectedShowRange.label}
                      </span>
                    </>
                  )}
                </span>
                <img
                  src={ArrowDown}
                  alt=""
                  className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
                    showEntriesOpen ? "rotate-180" : ""
                  } ${
                    selectedShowEntries === ""
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
                      className="w-full text-left px-4 py-2 text-[14px] transition-colors font-Gantari cursor-pointer text-[#8B8B8B] bg-[#FFFFFF] hover:text-[#353535] hover:bg-[#F2F2F2]"
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
                          className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-Gantari font-normal transition-colors cursor-pointer ${
                            isChosen
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
            <div className="w-full lg:w-auto">
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
            {/* Desktop Add Task Button */}
            <button
              type="button"
              onClick={() => navigate("/td/mytasks/add")}
              className="hidden sm:inline-flex items-center justify-center gap-2 rounded-md bg-[#DD4342] px-6 py-1.5 lg:py-2 bg-[#DD4342] text-white rounded-md font-Gantari font-semibold transition-all shadow-sm cursor-pointer"
            >
              <img src={AddBtn} alt="Add" className="h-5 w-5" />
              Add task
            </button>
          </div>
        </div>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 px-5">
        <Link
          to={statusFilter === "todo" ? pathname : `${pathname}?status=todo`}
          className={`flex items-center p-4 gap-4 rounded-xl border py-3 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "todo" ? "bg-orange-50 border-orange-300 ring-1 ring-orange-300" : "bg-white border-slate-200"}`}
        >
          <span className="text-[20px] font-bold text-[#0D1829]">To Do</span>

          <span className="text-[20px] font-bold text-[#0D1829]">
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
          className={`flex items-center p-4 gap-4 rounded-xl border py-3 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "in_progress" ? "bg-sky-50 border-sky-300 ring-1 ring-sky-300" : "bg-white border-slate-200"}`}
        >
          <span className="text-[20px] font-bold text-[#0D1829]">
            In Progress
          </span>

          <span className="text-[20px] font-bold text-[#0D1829]">
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
          className={`flex items-center p-4 gap-4 rounded-xl border py-3 shadow-sm hover:shadow-md transition-all relative ${statusFilter === "completed" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-white border-slate-200"}`}
        >
          <span className="text-[20px] font-bold text-[#0D1829]">Completed</span>

          <span className="text-[20px] font-bold text-[#0D1829]">
            ({counts.completed})
          </span>
          <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
            <img src={Group3} alt="Group3" className="w-8 h-8" />
          </div>
        </Link>
      </div>
      {/* Task columns area */}
      <div className="flex-1 min-h-0 lg:overflow-y-auto lg:custom-scrollbar px-4 pr-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pb-4 justify-items-center">
          <div
            className="flex flex-col items-center gap-2 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1 w-full max-w-md mx-auto"
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
              />
            ))}
          </div>
          <div
            className="flex flex-col items-center gap-2 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1 w-full max-w-md mx-auto"
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
              />
            ))}
          </div>
          <div
            className="flex flex-col items-center gap-2 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1 w-full max-w-md mx-auto"
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
              className="absolute left-4 top-4 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
              title="Close"
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
    </div>
  );
}
