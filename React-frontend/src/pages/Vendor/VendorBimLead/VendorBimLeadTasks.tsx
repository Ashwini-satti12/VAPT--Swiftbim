import { useEffect, useState, useRef, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../../lib/api";
import { toast } from "react-hot-toast";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import Group1 from "../../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../../assets/ProjectManager/MyTask/Group3.svg";
import Dot from "../../../assets/ProjectManager/MyTask/Dot.svg";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import Arrow from "../../../assets/ProjectManager/MyTask/arrow.svg";
import { FiX } from "react-icons/fi";
import { useAuth } from "../../../contexts/AuthContext";
import { getGlobalProfileUrl } from "../../../lib/profileHelpers";

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

export function formatDateForDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const datePart = value.includes("T") ? value.split("T")[0] : value;
  const parts = datePart.split("-");
  if (parts.length !== 3) return value;
  const [y, m, d] = parts;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

export function formatTimeForDisplay(value: string): string {
  if (!value || !value.match(/^\d{1,2}:\d{2}$/)) return "--:--";
  const [hStr, mStr] = value.split(":");
  const h24 = parseInt(hStr, 10);
  const m = mStr || "00";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? "AM" : "PM";
  return `${h12}:${m} ${ampm}`;
}

type DropdownId = "employee" | "projects" | "period" | null;

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
  /** `right`: anchor menu to trigger’s right edge */
  menuAlign?: "left" | "right";
  /** Fixed layer + portal so the menu isn’t clipped by `overflow-y-auto` ancestors */
  menuUseFixedLayer?: boolean;
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
    ? "right-0 w-full"
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
      : `inline-flex items-center justify-between rounded-md border border-transparent ${bgClass} px-4 py-1.5 sm:py-2 text-[14px] ${fontClass} font-Gantari cursor-pointer ${narrow ? "w-full" : "min-w-[140px]"}`;

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
      <div className="min-h-0 flex-1 overflow-y-auto py-1 custom-scrollbar [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#979797] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#7F7F7F] [scrollbar-width:thin] [scrollbar-color:#979797_transparent] pr-1">
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

interface Task {
  id: number;
  task_name: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  project_id?: number;
  project_name?: string;
  assigned_to?: number;
  uploaderid?: number;
  assigned_to_name?: string;
  assign_to?: string;
  category?: string;
  assigned_profile_picture?: string;
  uploader_full_name?: string;
  uploader_profile_picture?: string;
  is_assigned_to_me?: boolean;
  is_owned_by_me?: boolean;
  assigned_full_name?: string;
  start_date?: string;
  start_time?: string;
  end_time?: string;
  assigned_by_name?: string;
  Approval?: string;
}

interface Project {
  id: number;
  project_name: string;
  members?: string;
}

interface Employee {
  id: number;
  full_name: string;
  active?: string;
}

export default function VendorBimLeadTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States (matching MytaskTD.tsx)
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);

  const dropdownsContainerRef = useRef<HTMLDivElement>(null);
  const employeeTriggerRef = useRef<HTMLButtonElement>(null);
  const employeeMenuRef = useRef<HTMLDivElement>(null);
  const projectsTriggerRef = useRef<HTMLButtonElement>(null);
  const projectsMenuRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownContentRef = useRef<HTMLDivElement>(null);
  const periodTriggerRef = useRef<HTMLButtonElement>(null);
  const periodMenuRef = useRef<HTMLDivElement>(null);

  const cardMenuRef = useRef<HTMLDivElement>(null);

  const [openMenuTaskId, setOpenMenuTaskId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const fetchTasks = () => {
    api
      .get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks")
      .then(({ data }) => {
        const raw = data.tasks ?? [];
        const mapped = raw.map((t) => ({
          ...t,
          assigned_to_name: t.assigned_to_name ?? t.assigned_full_name,
          assigned_by_name: (t as any).assigned_by_name ?? "-",
          priority: (t as any).priority ?? (t as any).category ?? t.priority,
          uploader_full_name: (t as any).uploader_full_name || (t as any).uploader_name || "-",
        }));
        setTasks(mapped);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
    api
      .get<{ projects?: Project[] }>("/api/vendors/vendor-projects")
      .then(({ data }) => setProjects(data.projects ?? []));
    api
      .get<{ success?: boolean; resources?: Employee[] }>(
        "/api/vendors/vendor-resource-profiles",
      )
      .then(({ data }) => setEmployees(data.resources ?? []));

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (cardMenuRef.current && !cardMenuRef.current.contains(target)) {
        setOpenMenuTaskId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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





  const handleDelete = (taskId: number) => {
    setTaskToDelete(taskId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!taskToDelete) return;
    api
      .delete(`/api/vendors/vendor-tasks/${taskToDelete}`)
      .then(() => {
        setTasks((prev) => prev.filter((t) => t.id !== taskToDelete));
        toast.success("Task deleted");
        setShowDeleteModal(false);
        setTaskToDelete(null);
      })
      .catch(() => toast.error("Failed to delete task"));
  };

  const handleViewAction = (task: Task) => {
    setOpenMenuTaskId(null);
    navigate(`/vendor-bim-lead/tasks/view/${task.id}`, { state: { task } });
  };

  const SHOW_OPTIONS = [
    "Show Entries",
    "1-50",
    "51-100",
    "101-150",
    "151-200",
    "201-250",
    "251-300",
    "All",
  ];

  const normalizeStatus = (
    s: string | undefined,
    approval?: string,
  ): "todo" | "in_progress" | "completed" => {
    if (approval?.toLowerCase() === "approved" || approval?.toLowerCase() === "rejected")
      return "completed";
    if (!s) return "todo";
    const lower = s.toLowerCase().replace(/\s+/g, "_");
    if (lower.includes("progress") || lower === "in_progress")
      return "in_progress";
    if (lower.includes("complete") || lower === "done") return "completed";
    return "todo";
  };

  const handleMoveTask = (
    taskId: number,
    newBucket: "todo" | "in_progress" | "completed",
  ) => {
    const taskRow = tasks.find((t) => t.id === taskId);
    if (!taskRow) return;

    const current = getEffectiveStatus(taskRow);
    if (current === newBucket) return;

    if (current === "todo" && newBucket === "completed") {
      toast.error("Move task to In Progress before completing.");
      return;
    }
    if (current === "completed" && newBucket !== "completed") {
      toast.error("Completed tasks cannot be moved.");
      return;
    }

    const uploaderId = (taskRow as any).uploaderid ?? (taskRow as any).vendor_id;
    const isOwner = String(uploaderId) === String(user?.id);
    const statusMap = {
      todo: "Todo",
      in_progress: "InProgress",
      completed: "Completed",
    } as const;
    const apiStatus = statusMap[newBucket];
    const nextProgress = newBucket === "completed" ? (isOwner ? 100 : 95) : newBucket === "in_progress" ? 50 : 0;

    api
      .patch(`/api/vendors/vendor-tasks/${taskId}/status`, {
        status: apiStatus,
        progress: nextProgress,
      })
      .then(() => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, status: apiStatus, progress: nextProgress }
              : t,
          ),
        );
        toast.success(`Task moved to ${newBucket}`);
      })
      .catch(() => {
        toast.error("Failed to update status");
        fetchTasks();
      });
  };

  const getEffectiveStatus = (t: Task): "todo" | "in_progress" | "completed" => {
    const status = normalizeStatus(t.status, t.Approval);
    const progress = (t as any).progress;
    const uploaderId = (t as any).uploaderid ?? (t as any).vendor_id;
    const isOwner = String(uploaderId) === String(user?.id);
    const userName = (user?.full_name || user?.name || "").trim().toLowerCase();
    const taskAssigneeName = (t.assigned_full_name || t.assign_to || "").trim().toLowerCase();
    const isAssignedToMe = String(t.assigned_to) === String(user?.id) || (userName && taskAssigneeName === userName);
    const isAssignedToOthers = t.assigned_to != null && !isAssignedToMe;

    if ((isOwner && isAssignedToOthers && (progress === 95 || progress === "95") && status === "completed") || (t as any).review_required === true) {
      return "todo";
    }
    return status;
  };

  const handleApproveTask = (task: Task) => {
    api.patch(`/api/vendors/vendor-tasks/${task.id}/status`, { status: "Approved" })
      .then(() => {
        toast.success("Task Approved");
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, Approval: "Approved", progress: 100 } : t));
      })
      .catch(() => toast.error("Failed to approve task"));
  };
  (window as any).handleApproveTask = handleApproveTask;



  const { pathname } = useLocation();
  const statusFilter = searchParams.get("status") || searchParams.get("taskstatus");

  const employeeOptions = useMemo(() => {
    const raw = Array.isArray(employees) ? employees : [];
    const baseOptions = ["Select Employee", "Show All"];
    return [...baseOptions, ...raw.map((e) => e.full_name).filter(Boolean)];
  }, [employees]);

  const projectOptions = useMemo(() => {
    const raw = Array.isArray(projects) ? projects : [];
    const baseOptions = ["Select Projects", "Show All"];
    return [...baseOptions, ...raw.map((p) => p.project_name).filter(Boolean)];
  }, [projects]);

  const PERIOD_OPTIONS = [
    "Period",
    "This Week",
    "This Month",
    "This Quarter",
  ];

  const SHOW_ENTRIES_PLACEHOLDER = "Show Entries";
  const SHOW_ENTRIES_SELECTED_PREFIX = "Show:";
  const showEntriesOptions = [
    { value: "1-50", label: "1-50", start: 0, end: 50 },
    { value: "51-100", label: "51-100", start: 50, end: 100 },
    { value: "101-150", label: "101-150", start: 100, end: 150 },
    { value: "151-200", label: "151-200", start: 150, end: 200 },
    { value: "201-250", label: "201-250", start: 200, end: 250 },
    { value: "251-300", label: "251-300", start: 250, end: 300 },
    { value: "all", label: "All", start: 0, end: null },
  ];

  const myFilteredTasks = tasks.filter((t) => {
    if (searchQuery) {
      if (!(
        (t.task_name || "").toLowerCase().includes(searchQuery) ||
        (t.project_name || "").toLowerCase().includes(searchQuery) ||
        (t.assigned_to_name || "").toLowerCase().includes(searchQuery) ||
        (t.category || "").toLowerCase().includes(searchQuery) ||
        (t.status || "").toLowerCase().includes(searchQuery)
      )) {
        return false;
      }
    }

    // Employee filter
    if (
      selectedEmployee &&
      !["Select Employee", "Show All", "Employee"].includes(selectedEmployee)
    ) {
      if (
        (t.assigned_to_name || t.assigned_full_name || t.assign_to || "").toLowerCase() !==
        selectedEmployee.toLowerCase()
      )
        return false;
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
      const taskDate = new Date(t.start_date || t.due_date || "");
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

    const isAssignedToMe = Boolean(t.is_assigned_to_me);
    const isOwner = Boolean(t.is_owned_by_me);
    const isUnderReview = (t as any).review_required === true || ((t as any).progress === 95 && (t.status === "Completed" || t.status === "completed"));

    if (isAssignedToMe) return true;
    if (isOwner && isUnderReview && t.assigned_to != null) return true;
    return false;
  });

  const tasksByStatus = {
    todo: statusFilter && statusFilter !== "todo" ? [] : myFilteredTasks.filter((t) => getEffectiveStatus(t) === "todo"),
    in_progress: statusFilter && statusFilter !== "in_progress" ? [] : myFilteredTasks.filter((t) => getEffectiveStatus(t) === "in_progress"),
    completed: statusFilter && statusFilter !== "completed" ? [] : myFilteredTasks.filter((t) => getEffectiveStatus(t) === "completed"),
  };

  const effectiveShowEntryValue = selectedShowEntries || "all";
  const selectedShowRange = showEntriesOptions.find((opt) => opt.value === effectiveShowEntryValue) ?? showEntriesOptions[6];

  const sliceForShowEntries = <T,>(arr: T[]): T[] => {
    const rangeEnd = selectedShowRange.end === null ? arr.length : Math.min(selectedShowRange.end, arr.length);
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
    <div className="h-full min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden bg-white custom-scrollbar [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#979797] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#7F7F7F] [scrollbar-width:thin] [scrollbar-color:#979797_transparent] [&::-webkit-scrollbar-button]:block [&::-webkit-scrollbar-button]:h-2 [&::-webkit-scrollbar-button:vertical:decrement]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 2L1 8h8z\' fill=\'%23979797\'/></svg>')] [&::-webkit-scrollbar-button:vertical:increment]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 8L1 2h8z\' fill=\'%23979797\'/></svg>')] pr-1 relative font-gantari">
      <div className="bg-white flex-shrink-0 px-5 pt-0 sm:pt-0 sm:mt-2">
        {/* Row 1: Title and Add Task button for mobile only (hidden on lg) */}
        <div className="flex flex-row items-center justify-between w-full mb-4 lg:hidden">
          <h2 className="text-[20px] sm:text-[24px] font-semibold text-slate-800 font-Gantari">
            Tasks
          </h2>
          <button
            type="button"
            onClick={() => navigate("/vendor-bim-lead/tasks/add", { state: { from: "tasks" } })}
            className="sm:hidden inline-flex items-center justify-center gap-2 rounded-md bg-[#DD4342] px-4 py-1.5 text-[14px] font-medium text-[#F2F2F2] shadow-sm cursor-pointer whitespace-nowrap active:scale-[0.98] transition-all"
          >
            Add task
          </button>
        </div>

        {/* Row 2: Title (LG only) + Filters + Desktop Add Task button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <h2 className="hidden lg:block text-[24px] font-semibold text-slate-800 font-Gantari">
            Tasks
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
                        {selectedShowRange.label}
                      </span>
                    </>
                  )}
                </span>
                <img
                  src={ArrowDown}
                  alt=""
                  className={`w-3 h-3 shrink-0 transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""
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
                    className="max-h-[168px] overflow-y-auto custom-scrollbar [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#979797] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#7F7F7F] [scrollbar-width:thin] [scrollbar-color:#979797_transparent] [&::-webkit-scrollbar-button]:block [&::-webkit-scrollbar-button]:h-2 [&::-webkit-scrollbar-button:vertical:decrement]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 2L1 8h8z\' fill=\'%23979797\'/></svg>')] [&::-webkit-scrollbar-button:vertical:increment]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 8L1 2h8z\' fill=\'%23979797\'/></svg>')] pr-1"
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
                          className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] font-Gantari font-normal transition-colors cursor-pointer ${isChosen
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
            <div className="w-full lg:w-[130px]">
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
              onClick={() => {
                navigate("/vendor-bim-lead/tasks/add", { state: { from: "tasks" } });
              }}
              className="hidden sm:inline-flex items-center justify-center gap-2 rounded-md bg-[#DD4342] px-6 py-1.5 lg:py-2 text-white rounded-md font-Gantari font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
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
      <div className="flex-1 min-h-0 lg:overflow-y-auto lg:custom-scrollbar [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#979797] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#7F7F7F] [scrollbar-width:thin] [scrollbar-color:#979797_transparent] [&::-webkit-scrollbar-button]:block [&::-webkit-scrollbar-button]:h-2 [&::-webkit-scrollbar-button:vertical:decrement]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 2L1 8h8z\' fill=\'%23979797\'/></svg>')] [&::-webkit-scrollbar-button:vertical:increment]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M5 8L1 2h8z\' fill=\'%23979797\'/></svg>')] px-4 pr-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pb-4 justify-items-center">
          {(["todo", "in_progress", "completed"] as const).map((bucket) => (
            <div
              key={bucket}
              className="flex flex-col items-center gap-2 min-h-[120px] rounded-md border-2 border-dashed border-transparent transition-colors p-1 w-full max-w-md mx-auto"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = Number(e.dataTransfer.getData("taskId"));
                if (!Number.isNaN(taskId)) handleMoveTask(taskId, bucket);
              }}
            >
              {displayedTasksByStatus[bucket].map((task) => {
                const progressValue =
                  bucket === "todo"
                    ? 0
                    : bucket === "in_progress"
                      ? 50
                      : task.assigned_to != null &&
                        ((task as any).uploaderid != null || (task as any).vendor_id != null) &&
                        String(task.assigned_to) !== String((task as any).uploaderid ?? (task as any).vendor_id)
                        ? task.Approval?.toLowerCase() === "approved"
                          ? 100
                          : 95
                        : 100;

                const isReviewState =
                  (bucket === "completed" ||
                    (task as any).review_required ||
                    Number((task as any).progress) === 95) &&
                  task.assigned_to != null &&
                  ((task as any).uploaderid != null || (task as any).vendor_id != null) &&
                  String(task.assigned_to) !== String((task as any).uploaderid ?? (task as any).vendor_id) &&
                  task.Approval?.toLowerCase() !== "approved";

                const isCompletedCol =
                  getEffectiveStatus(task) === "completed";
                return (
                  <div
                    key={task.id}
                    draggable={!isCompletedCol}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("taskId", String(task.id));
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData(
                        "text/plain",
                        task.task_name || "Task",
                      );
                    }}
                    className={`mt-2 rounded-lg border border-[#AEACAC52] bg-white p-3 shadow-sm relative mx-auto w-full max-w-full lg:max-w-none ${isCompletedCol ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex flex-col min-w-0 flex-1">
                        <h4 className="font-medium text-[#353535] text-[20px] truncate leading-tight">
                          {task.task_name || "Task Name"}
                        </h4>
                      </div>
                      <div
                        className="relative"
                        ref={openMenuTaskId === task.id ? cardMenuRef : null}
                      >
                        <button
                          type="button"
                          draggable={false}
                          onClick={() =>
                            setOpenMenuTaskId(
                              openMenuTaskId === task.id ? null : task.id,
                            )
                          }
                          className="p-0.5 rounded cursor-pointer"
                        >
                          <img
                            src={Dot}
                            alt="Dot"
                            className="w-4 h-4 text-slate-600"
                          />
                        </button>
                        {openMenuTaskId === task.id && (
                          <div className="absolute top-full right-0 mt-1 z-50 min-w-[160px] bg-white/20 backdrop-blur-md rounded-md border border-[#59595980] shadow-xl transition-all duration-200 ease-out origin-top-right">
                            <button
                              type="button"
                              draggable={false}
                              onClick={() => handleViewAction(task)}
                              className="flex w-full items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
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
                            {!isCompletedCol && (
                              <>
                                <button
                                  type="button"
                                  draggable={false}
                                  onClick={() => {
                                    setOpenMenuTaskId(null);
                                    navigate("/vendor-bim-lead/tasks/edit", {
                                      state: { task, from: "tasks" },
                                    });
                                  }}
                                  className="flex w-full items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
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
                                  draggable={false}
                                  onClick={() => {
                                    setOpenMenuTaskId(null);
                                    handleDelete(task.id);
                                  }}
                                  className="flex w-full items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer"
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
                            {isReviewState && String((task as any).uploaderid ?? (task as any).vendor_id) === String(user?.id) && (
                              <button
                                type="button"
                                className="flex w-full items-center gap-4 px-6 py-2 transition-colors text-left group cursor-pointer border-0 bg-transparent shadow-none"
                                onClick={() => {
                                  setOpenMenuTaskId(null);
                                  (window as any).handleApproveTask?.(task);
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
                      <div className="flex flex-col">
                        <span className="text-[14px] font-medium text-[#000000]">Start Date</span>
                        <span className="text-[14px] font-medium text-[#8B8B8B]">
                          {formatDateForDisplay(task.start_date || (task as any).startdate) || "—"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[14px] font-medium text-[#000000]">End Date</span>
                        <span className="text-[14px] font-medium text-[#8B8B8B]">
                          {formatDateForDisplay(task.due_date) || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[12px] text-[#8B8B8B]">Progress</span>
                      <span className="text-[12px] text-[#8B8B8B]">
                        {isReviewState ? "95% (Under Review)" : `${progressValue}%`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-4">
                      <div
                        className="h-full rounded-full bg-[#8B8B8B]"
                        style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <div className="flex -space-x-2">
                          {/* Assigned To avatar */}
                          {task.assigned_to_name &&
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
                              const initials = task.assigned_to_name
                                .split(" ")
                                .filter(Boolean)
                                .map((p) => p[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase();
                              return (
                                <div
                                  className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 overflow-hidden"
                                  title={`Assigned To: ${task.assigned_to_name}`}
                                >
                                  {src ? (
                                    <img
                                      src={src}
                                      alt={task.assigned_to_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span>{initials}</span>
                                  )}
                                </div>
                              );
                            })()}
                          {/* Assigned By avatar */}
                          {task.uploader_full_name && task.uploader_full_name !== "-" &&
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
                        onClick={() => handleViewAction(task)}
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
              })}
              {displayedTasksByStatus[bucket].length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 w-full">
                  No tasks
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete Task Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl max-w-xl w-full p-2 relative flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setTaskToDelete(null);
              }}
              className="absolute left-4 top-4 p-2 rounded-[5px] bg-[#F2F2F2] text-gray-800 transition-colors cursor-pointer"
              title="Close"
            >
              <FiX className="h-5 w-5 text-black" />
            </button>
            <h3 className="text-[18px] font-Gantari font-semibold text-[#020202] mt-[12px] mb-3">
              Delete Task
            </h3>
            <p className="text-[14px] font-Gantari font-semibold text-[#020202] mb-8 md:mb-10 text-center">
              Are you sure, you want to Delete this?
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto mb-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setTaskToDelete(null);
                }}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#E8E8E8] text-[#353535] font-Gantari font-semibold text-[14px] transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="w-full sm:w-auto px-10 md:px-12 py-2 rounded-md bg-[#FFD9D9] text-[#E00100] font-Gantari font-semibold text-[14px] transition-all cursor-pointer"
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
