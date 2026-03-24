import { useEffect, useState, useRef } from "react";
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import api from "../../lib/api";
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

function formatTimeForDisplay(value: string): string {
  if (!value || !value.match(/^\d{1,2}:\d{2}$/)) return "--:--";
  const [hStr, mStr] = value.split(":");
  const h24 = parseInt(hStr, 10);
  const m = mStr || "00";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? "AM" : "PM";
  return `${h12}:${m} ${ampm}`;
}

/* Unused - using TimePickerWheel
function TimePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [hourStr, minStr] = value ? value.split(":") : ["", ""];
  let hour12 = hourStr ? parseInt(hourStr, 10) : "";
  let ampm = "AM";
  if (typeof hour12 === "number") {
    if (hour12 >= 12) { if (hour12 > 12) hour12 -= 12; ampm = "PM"; }
    else if (hour12 === 0) hour12 = 12;
  }
  const h = hour12 ? String(hour12).padStart(2, "0") : "";
  const m = minStr || "";
  const handleTimeChange = (newH: string, newM: string, newAmPm: string) => {
    if (!newH && !newM) { onChange(""); return; }
    const safeH = newH || "12", safeM = newM || "00";
    let h24 = parseInt(safeH, 10);
    if (newAmPm === "PM" && h24 < 12) h24 += 12;
    if (newAmPm === "AM" && h24 === 12) h24 = 0;
    onChange(`${String(h24).padStart(2, "0")}:${safeM.padStart(2, "0")}`);
  };
  return (
    <div className="flex items-center w-full rounded-sm bg-[#F2F3F4] px-3 py-2 border border-transparent focus-within:border-[#AEACAC52] focus-within:ring-1 focus-within:ring-[#AEACAC52] transition-all">
      <input type="text" maxLength={2} value={h} placeholder="hh" onChange={(e) => { const val = e.target.value.replace(/\D/g, ""); let num = parseInt(val, 10); if (num > 12) num = 12; handleTimeChange(val ? String(num) : "", m, ampm); }} className="w-6 bg-transparent text-center text-[14px] text-[#353535] placeholder-[#8B8B8B] focus:outline-none" />
      <span className="text-[#353535] font-bold mx-1">:</span>
      <input type="text" maxLength={2} value={m} placeholder="mm" onChange={(e) => { const val = e.target.value.replace(/\D/g, ""); let num = parseInt(val, 10); if (num > 59) num = 59; handleTimeChange(h, val ? String(num) : "", ampm); }} className="w-6 bg-transparent text-center text-[14px] text-[#353535] placeholder-[#8B8B8B] focus:outline-none" />
      <select value={ampm} onChange={(e) => handleTimeChange(h, m, e.target.value)} className="ml-auto bg-transparent text-[14px] text-[#353535] focus:outline-none cursor-pointer font-medium">
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
*/

type DropdownId = "employee" | "projects" | "show" | "period" | null;
type FormDropdownId =
  | "project"
  | "module"
  | "taskName"
  | "type"
  | "assignTo"
  | "type_start_time"
  | "type_end_time"
  | null;

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
  const displayLabel = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : label;

  const filteredOptions = searchable
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.value === "", // always keep placeholder
      )
    : options;

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`flex w-full items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-left text-[14px] transition-all border border-transparent focus:outline-none focus:border-[#AEACAC52] focus:ring-1 focus:ring-[#AEACAC52] ${value ? "text-[#353535]" : "text-[#8B8B8B]"}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span>{displayLabel}</span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
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
                placeholder="Search..."
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-800 placeholder-slate-400"
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
                  setSearchQuery("");
                  onClose();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-[#616161] hover:text-[#353535] hover:bg-slate-100 first:rounded-t-lg last:rounded-b-lg"
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
        className={`inline-flex items-center justify-between rounded-md bg-[#E8E8E8] px-4 py-2 text-sm ${narrow ? "min-w-[90px]" : "min-w-[140px]"}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span
          className={`truncate font-gantari ${selected && selected !== label ? "text-[#353535]" : "text-[#616161]"}`}
        >
          {label.toLowerCase() === "show" && selected && selected !== label ? (
            <>
              <span className="text-sm text-[#353535]">Show:</span>{" "}
              <span>{selected}</span>
            </>
          ) : (
            (selected ?? label)
          )}
        </span>
        <img
          src={ArrowDown}
          alt="arrow"
          className={`ml-2 w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
                className={`block w-full px-4 py-2 text-left text-sm font-gantari transition-colors ${selected === opt ? "bg-gray-100 text-[#353535]" : "text-[#616161] hover:text-[#353535] hover:bg-gray-200"}`}
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
        className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-90"
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
        className="shrink-0 p-0.5 rounded text-black hover:bg-slate-200 hover:text-slate-700"
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
  Approval?: string;
  projectid?: number;
  created_at?: string;
}

interface Employee {
  id: number;
  full_name: string;
}

interface Project {
  id: number;
  project_name: string;
  tasks?: string;
}

/** Map task (local or API shape) to form values so every detail shows in edit. */
function taskToFormValues(task: Task | Record<string, unknown>): {
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
      t.start_time ?? t.startTime ?? t.Actual_start_time ?? "",
    ),
    dueTime: timeOnly(t.due_time ?? t.dueTime ?? t.end_time ?? ""),
    assignTo: str(t.assign_to ?? t.assignTo ?? t.assigned_to ?? ""),
    description: str(t.description ?? ""),
    checklist: str(t.checklist ?? ""),
  };
}

// function formatDateRange(start?: string, end?: string): string {
//   if (!start && !end) return "—";
//   const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
//   const fmtShort = (s: string) => {
//     const d = new Date(s);
//     return `${d.getDate()} ${months[d.getMonth()]}`;
//   };
//   const fmtFull = (s: string) => {
//     const d = new Date(s);
//     return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
//   };
//   if (start && end) return `${fmtShort(start)} - ${fmtFull(end)}`;
//   if (start) return fmtFull(start);
//   return end ? fmtFull(end) : "—";
// }

function normalizeStatus(
  s: string | undefined,
  approval?: string,
): "todo" | "in_progress" | "completed" {
  if (approval?.toLowerCase() === "approved") return "completed";
  if (approval?.toLowerCase() === "rejected") return "completed";
  if (!s) return "todo";
  const lower = s.toLowerCase().replace(/\s+/g, "_");
  if (lower.includes("progress") || lower === "in_progress")
    return "in_progress";
  if (lower.includes("complete") || lower === "done") return "completed";
  return "todo";
}

/* Unused
const STATUS_STYLE: Record<
  "todo" | "in_progress" | "completed",
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
};
*/

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
  const progress = task.progress ?? 0;
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

  const startStr = task.start_date
    ? `${new Date(task.start_date).getDate().toString().padStart(2, "0")}-${(new Date(task.start_date).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.start_date).getFullYear()}`
    : "—";
  const endStr = task.due_date
    ? `${new Date(task.due_date).getDate().toString().padStart(2, "0")}-${(new Date(task.due_date).getMonth() + 1).toString().padStart(2, "0")}-${new Date(task.due_date).getFullYear()}`
    : "";

  return (
    <div
      draggable={!isCompleted}
      onDragStart={handleDragStart}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm relative ${isCompleted ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="font-semibold text-slate-900 text-xl truncate">
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
            className="p-0.5 rounded hover:bg-slate-100"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <img src={Dot} alt="Dot" className="w-4 h-4 text-slate-600" />
          </button>
            {menuOpen && (
              <div
                className={`absolute top-full mt-1 z-50 min-w-[160px] bg-white/20 backdrop-blur-md rounded-xl border border-[#59595980] shadow-xl transition-all duration-200 ease-out ${isCompleted ? "right-full mr-1 origin-top-right" : "left-full ml-1 origin-top-left"} ${menuOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group"
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
                  <span className="text-[16px] font-semibold text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                    View
                  </span>
                </button>
                {!isCompleted && (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group"
                      onClick={() => {
                        setMenuOpen(false);
                        onEditTask?.(task);
                      }}
                    >
                      <img
                        src={editIcon}
                        alt="edit"
                        className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                      />
                      <span className="text-[16px] font-semibold text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                        Edit
                      </span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-4 px-6 py-3 transition-colors text-left group"
                      onClick={() => {
                        setMenuOpen(false);
                        onDeleteTask?.(task);
                      }}
                    >
                      <img
                        src={deleteIcon}
                        alt="delete"
                        className="w-5 h-5 transition-[filter] group-hover:[filter:invert(27%)_sepia(93%)_saturate(1500%)_hue-rotate(340deg)_brightness(95%)_contrast(90%)]"
                      />
                      <span className="text-[16px] font-semibold text-[#616161] font-Gantari group-hover:text-[#DD4342]">
                        Delete
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mb-3 text-[13px] font-medium text-[#0A2E65]">
        <span>{startStr}</span>
        <span>{endStr}</span>
      </div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs text-slate-600">Progress</span>
        <span className="text-xs font-medium text-slate-700">{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-slate-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white shrink-0"
                title="Assignee"
              />
            ))}
          </div>
          <span className="text-xs text-slate-500">+4</span>
        </div>
        <Link
          to={`/tasks/${task.id}`}
          draggable={false}
          className="inline-flex items-center text-xs font-medium text-slate-700 hover:text-slate-900 gap-2"
        >
          Details
          <img src={Arrow} alt="Arrow" className="w-2 h-2" />
        </Link>
      </div>
    </div>
  );
}

const SHOW_OPTIONS = [
  "Show",
  "1-50",
  "51-100",
  "101-150",
  "151-200",
  "201-250",
  "251-300",
  "All",
];
const PERIOD_OPTIONS = [
  "Period",
  "This Week",
  "This Month",
  "This Quarter",
  "Custom",
];

export default function TeamtaskPM() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const isTeam =
    searchParams.get("condition") === "1" ||
    pathname.includes("teamtask") ||
    pathname.endsWith("/team");
  const statusFilter =
    searchParams.get("status") || searchParams.get("taskstatus");
  const STORAGE_KEY = "pm_teamTask_localTasks";
  const DELETED_IDS_KEY = "pm_teamTask_deletedIds";
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

  const loadDeletedIds = (): number[] => {
    try {
      const raw = localStorage.getItem(DELETED_IDS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as number[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const [deletedIds, setDeletedIds] = useState<number[]>(loadDeletedIds);
  const [loading, setLoading] = useState(true);

  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string | null>("Show");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<string[]>([]);

  const merged = [
    ...localTasks,
    ...list.filter((t) => !localTasks.some((l) => l.id === t.id)),
  ];
  const allTasksBase = merged.filter((t) => !deletedIds.includes(t.id));
  const allTasks = allTasksBase.filter((t: any) => {
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
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localTasks));
    } catch {
      // ignore quota or parse errors
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openEditTask = (task: Task) => {
    setAddTaskForm(taskToFormValues(task));
    setEditingTaskId(task.id);
    setAddTaskModalOpen(true);
  };

  const openDeleteTask = (task: Task) => {
    setDeleteTaskId(task.id);
  };

  const openViewTask = (task: Task) => {
    navigate("/tasks/taskview", { state: { task, from: "teamtask" } });
  };

  const confirmDeleteTask = () => {
    if (deleteTaskId !== null) {
      api
        .delete(`/api/tasks/${deleteTaskId}`)
        .then(() => {
          api
            .get<{
              tasks?: Task[];
            }>("/api/tasks", { params: { condition: isTeam ? "1" : "0" } })
            .then((res) => setList(res.data.tasks ?? []));
          setLocalTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));
          setDeletedIds((prev) =>
            prev.includes(deleteTaskId) ? prev : [...prev, deleteTaskId],
          );
        })
        .finally(() => {
          setDeleteTaskId(null);
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
  const formTaskNameTriggerRef = useRef<HTMLButtonElement>(null);
  const formTaskNameMenuRef = useRef<HTMLDivElement>(null);
  const formTypeTriggerRef = useRef<HTMLButtonElement>(null);
  const formTypeMenuRef = useRef<HTMLDivElement>(null);
  const formAssignTriggerRef = useRef<HTMLButtonElement>(null);
  const formAssignMenuRef = useRef<HTMLDivElement>(null);
  const formStartTimeTriggerRef = useRef<HTMLButtonElement>(null);
  const formStartTimeMenuRef = useRef<HTMLDivElement>(null);
  const formEndTimeTriggerRef = useRef<HTMLButtonElement>(null);
  const formEndTimeMenuRef = useRef<HTMLDivElement>(null);
  const [attachmentPreviewFile, setAttachmentPreviewFile] =
    useState<File | null>(null);

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
            : openFormDropdown === "taskName"
              ? [formTaskNameTriggerRef, formTaskNameMenuRef]
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
    if (isTeam) params.condition = "1";

    Promise.all([
      api.get<{ tasks?: Task[] }>("/api/tasks", { params }),
      api.get<{ employees?: Employee[] }>("/api/employees"),
      api.get<{ projects?: Project[] }>("/api/projects"),
    ])
      .then(([tasksRes, empRes, projRes]) => {
        setList(tasksRes.data.tasks ?? []);
        setEmployees(empRes.data.employees ?? []);
        setProjects(projRes.data.projects ?? []);
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
    const selectedProj = projects.find(
      (p) => p.project_name === addTaskForm.projectName,
    );
    if (selectedProj) {
      api
        .post<{ success: boolean; modules: { label: string }[] }>(
          "/api/projects/filters/modules",
          { projectId: selectedProj.id },
        )
        .then(({ data }) => {
          setModules(data.modules.map((m) => m.label));
        })
        .catch(() => setModules([]));
    }
  }, [addTaskForm.projectName, projects]);

  const employeeOptions = [
    "Select Employee",
    ...employees.map((e) => e.full_name),
  ];
  const projectOptions = [
    "Select Projects",
    ...projects.map((p) => p.project_name),
  ];
  const modalProjectOptions = projects.map((p) => ({
    value: p.project_name,
    label: p.project_name,
  }));
  // taskTypes unused: ["Task", "Bug", "Feature"]
  const modalAssignOptions = employees.map((e) => ({
    value: e.full_name,
    label: e.full_name,
  }));

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

  let limitStart = 0;
  let limitEnd = 50;
  if (selectedShow === "All" || !selectedShow || selectedShow === "Show") {
    limitStart = 0;
    limitEnd = Infinity;
  } else if (selectedShow && selectedShow.includes("-")) {
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="bg-white pb-3 flex-shrink-0">
        {/* Top row: title + dropdowns + Add task - match MytaskTD */}
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
            <button
              type="button"
              onClick={() => navigate("/tasks/add")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              <img src={AddBtn} alt="Add" className="h-5 w-5" />
              Add task
            </button>
          </div>
        </div>

        {/* Status summary cards - match MytaskTD */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <Link
            to={statusFilter === "todo" ? pathname : `${pathname}?status=todo`}
            className="flex p-4 gap-4 rounded-xl border border-slate-200 bg-white py-4 shadow-sm hover:shadow-md transition-shadow relative"
          >
            <span className="text-xl font-bold text-[#0D1829]">To Do</span>
            <span className="text-xl font-bold text-[#0D1829]">
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
            className="flex p-4 gap-4 rounded-xl border border-slate-200 bg-white py-4 shadow-sm hover:shadow-md transition-shadow relative"
          >
            <span className="text-xl font-bold text-[#0D1829]">
              In Progress
            </span>
            <span className="text-xl font-bold text-[#0D1829]">
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
            className="flex p-4 gap-4 rounded-xl border border-slate-200 bg-white py-4 shadow-sm hover:shadow-md transition-shadow relative"
          >
            <span className="text-xl font-bold text-[#0D1829]">Completed</span>
            <span className="text-xl font-bold text-[#0D1829]">
              ({counts.completed})
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
              <img src={Group3} alt="Group3" className="w-8 h-8" />
            </div>
          </Link>
        </div>
      </div>

      {/* Task columns scrollable area - match MytaskTD */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 -mr-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
          <div
            className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1"
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
            className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1"
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
            className="space-y-3 min-h-[120px] rounded-lg border-2 border-dashed border-transparent transition-colors p-1"
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
      {deleteTaskId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteTaskId(null)}
                className="p-1 rounded-sm text-black hover:bg-[#E0E0E0] bg-[#F0F0F0] transition-colors"
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
              <h3 className="flex-1 text-center text-lg font-semibold text-[#353535]">
                Delete Task
              </h3>
              <div className="w-9" />
            </div>
            <div className="px-6 py-5">
              <p className="text-black text-center">
                Are you sure, you want to Delete this Task?
              </p>
            </div>
            <div className="flex justify-center gap-3 px-6 py-4 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setDeleteTaskId(null)}
                className="rounded-md bg-[#F0F0F0] px-5 py-2 text-sm font-medium text-black hover:bg-[#E0E0E0]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                className="rounded-lg bg-[#FFD9D9] px-5 py-2 text-sm font-medium text-[#E00100] hover:bg-[#FFB3B3]"
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
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
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
                  ? list.find((t) => t.id === editingTaskId)
                  : null;

                const payload = {
                  projectid:
                    projects.find(
                      (p) => p.project_name === addTaskForm.projectName,
                    )?.id || addTaskForm.projectName,
                  taskName: addTaskForm.taskName,
                  category: addTaskForm.type,
                  startdate: addTaskForm.actualStartDate,
                  dueDate: addTaskForm.actualEndDate,
                  startTime: addTaskForm.startTime,
                  dueTime: addTaskForm.dueTime,
                  assignedTo:
                    employees.find((e) => e.full_name === addTaskForm.assignTo)
                      ?.id || addTaskForm.assignTo,
                  description: addTaskForm.description,
                  checklist: addTaskForm.checklist,
                  modules: addTaskForm.module,
                };

                const handleFiles = (taskId: number | string) => {
                  if (attachmentFiles.length > 0) {
                    const formData = new FormData();
                    attachmentFiles.forEach((f) => formData.append("image", f));
                    api.post(`/api/tasks/${taskId}/output-files`, formData, {
                      headers: { "Content-Type": "multipart/form-data" },
                    });
                  }
                };

                if (isEditing && existing) {
                  api
                    .patch(`/api/tasks/${existing.id}`, {
                      task_name: payload.taskName,
                      assigned_to: payload.assignedTo,
                      due_date: payload.dueDate,
                      category: payload.category,
                      description: payload.description,
                      checklist: payload.checklist,
                      modules_name: payload.modules,
                      Actual_start_time: payload.startdate,
                      start_time: payload.startTime,
                      due_time: payload.dueTime,
                    })
                    .then(() => {
                      handleFiles(existing.id);
                      api
                        .get<{
                          tasks?: Task[];
                        }>("/api/tasks", { params: { condition: isTeam ? "1" : "0" } })
                        .then((res) => setList(res.data.tasks ?? []));
                    });
                } else {
                  api.post("/api/tasks", payload).then((res) => {
                    if (res.data.success && res.data.task_id) {
                      handleFiles(res.data.task_id);
                      api
                        .get<{
                          tasks?: Task[];
                        }>("/api/tasks", { params: { condition: isTeam ? "1" : "0" } })
                        .then((r) => setList(r.data.tasks ?? []));
                    }
                  });
                }
                resetTaskFormAndClose();
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[16px] font-medium text-[#000000] mb-1">
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
                  <label className="block text-[16px] font-medium text-[#000000] mb-1">
                    Select Module
                  </label>
                  <FormDropdown
                    label="Select Module"
                    options={[
                      { value: "", label: "Select Module" },
                      ...modules.map((m) => ({ value: m, label: m })),
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
                  <label className="block text-[16px] font-medium text-[#000000] mb-1">
                    Task Name
                  </label>
                  <FormDropdown
                    label="Select Task"
                    options={[
                      { value: "", label: "Select Task" },
                      ...(projects.find(
                        (p) => p.project_name === addTaskForm.projectName,
                      )?.tasks
                        ? projects
                            .find(
                              (p) => p.project_name === addTaskForm.projectName,
                            )!
                            .tasks!.split(",")
                            .map((t) => ({ value: t.trim(), label: t.trim() }))
                        : []),
                    ]}
                    value={addTaskForm.taskName}
                    onChange={(v) =>
                      setAddTaskForm((f) => ({ ...f, taskName: v }))
                    }
                    isOpen={openFormDropdown === "taskName"}
                    onToggle={() =>
                      setOpenFormDropdown((d) =>
                        d === "taskName" ? null : "taskName",
                      )
                    }
                    onClose={() => setOpenFormDropdown(null)}
                    triggerRef={formTaskNameTriggerRef}
                    dropdownRef={formTaskNameMenuRef}
                    searchable
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[16px] font-medium text-[#000000] mb-1">
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
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#000000] mb-1">
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
                      className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] border border-transparent focus:outline-none focus:border-[#AEACAC52] focus:ring-1 focus:ring-[#AEACAC52] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#000000] mb-1">
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
                      className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] border border-transparent focus:outline-none focus:border-[#AEACAC52] focus:ring-1 focus:ring-[#AEACAC52] transition-all"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="relative">
                    <label className="block text-[16px] font-medium text-[#000000] mb-1">
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
                      className="flex w-full items-center justify-between rounded-sm bg-[#E8E8E8] px-3 py-2 text-left text-sm"
                    >
                      <span
                        className={
                          addTaskForm.startTime
                            ? "text-[#353535]"
                            : "text-[#616161]"
                        }
                      >
                        {formatTimeForDisplay(addTaskForm.startTime)}
                      </span>
                      <svg
                        className="ml-2 h-4 w-4 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {openFormDropdown === "type_start_time" && (
                      <div
                        ref={formStartTimeMenuRef}
                        className="absolute top-full left-0 z-20 mt-1"
                      >
                        <TimePickerWheel
                          value={addTaskForm.startTime}
                          onChange={(v) =>
                            setAddTaskForm((f) => ({ ...f, startTime: v }))
                          }
                          onClose={() => setOpenFormDropdown(null)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-[16px] font-medium text-[#000000] mb-1">
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
                      className="flex w-full items-center justify-between rounded-sm bg-[#E8E8E8] px-3 py-2 text-left text-sm"
                    >
                      <span
                        className={
                          addTaskForm.dueTime
                            ? "text-[#353535]"
                            : "text-[#616161]"
                        }
                      >
                        {formatTimeForDisplay(addTaskForm.dueTime)}
                      </span>
                      <svg
                        className="ml-2 h-4 w-4 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {openFormDropdown === "type_end_time" && (
                      <div
                        ref={formEndTimeMenuRef}
                        className="absolute top-full left-0 z-20 mt-1"
                      >
                        <TimePickerWheel
                          value={addTaskForm.dueTime}
                          onChange={(v) =>
                            setAddTaskForm((f) => ({ ...f, dueTime: v }))
                          }
                          onClose={() => setOpenFormDropdown(null)}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[16px] font-medium text-[#000000] mb-1">
                      Assign To
                    </label>
                    <FormDropdown
                      label="Select Assign To"
                      options={[
                        { value: "", label: "Select Assign To" },
                        ...modalAssignOptions,
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
                  <label className="block text-[16px] font-medium text-[#000000] mb-1">
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
                    className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] border border-transparent focus:outline-none focus:border-[#AEACAC52] focus:ring-1 focus:ring-[#AEACAC52] transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[16px] font-medium text-[#000000] mb-1">
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
                    className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] border border-transparent focus:outline-none focus:border-[#AEACAC52] focus:ring-1 focus:ring-[#AEACAC52] transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[16px] font-medium text-[#000000] mb-1">
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
                        className="flex-1 rounded-l-sm rounded-r-none bg-[#F2F3F4] px-3 py-2 text-[14px] text-[#353535] placeholder:text-[#8B8B8B] border border-transparent focus:outline-none focus:border-[#AEACAC52] focus:ring-1 focus:ring-[#AEACAC52] transition-all truncate"
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
                  className="rounded-lg bg-[#F2F2F2] px-5 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#DBE9FE] px-5 py-2 text-sm font-medium text-[#101827] hover:bg-[#D5E6FF]"
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
