import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../../lib/api";
import viewIcon from "../../../assets/ProjectManager/project/viewIcon.svg";
import editIcon from "../../../assets/ProjectManager/project/editIcon.svg";
import deleteIcon from "../../../assets/ProjectManager/project/deleteIcon.svg";
import Group1 from "../../../assets/ProjectManager/MyTask/Group1.svg";
import Group2 from "../../../assets/ProjectManager/MyTask/Group2.svg";
import Group3 from "../../../assets/ProjectManager/MyTask/Group3.svg";
import Dot from "../../../assets/ProjectManager/MyTask/Dot.svg";
import AddBtn from "../../../assets/TechnicalDirector/add btn.svg";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";

interface Task {
    id: number;
    task_name: string;
    description?: string;
    status: string;
    /** UI label for vendor_task.category */
    priority: string;
    category?: string;
    due_date?: string;
    project_id?: number;
    project_name?: string;
    assigned_to?: number;
    /** Resolved assignee name from vendor_task; derived from assigned_full_name */
    assigned_to_name?: string;
    assigned_full_name?: string;
    /** Use vendor_task.modules to store selected Team/Department */
    modules?: string;
}

interface Project {
    id: number;
    project_name: string;
    modules?: string;
    members?: string;
}

interface Employee {
    id: number;
    full_name: string;
    active?: string;
}

interface Team {
    id?: number;
    team_id?: number;
    team_name: string;
}

// ─── FormDropdown (same as TeamtaskPMV) ─────────────────────────────────────

type FormDropdownId = "project" | "team" | "priority" | "assignTo" | null;

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
}: FormDropdownProps) {
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
                className="flex w-full items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-left text-sm text-black cursor-pointer"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={label}
            >
                <span className={value ? "text-black" : "text-[#8B8B8B]"}>
                    {displayLabel}
                </span>
                <svg
                    className={`ml-2 h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
                    <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar font-Gantari">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                role="option"
                                onClick={() => {
                                    onChange(opt.value);
                                    onClose();
                                }}
                                className="block w-full px-3 py-2 text-left text-sm text-[#8B8B8B] hover:text-[#353535] hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg cursor-pointer"
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

// ─── Date helpers ────────────────────────────────────────────────────────────

function getTodayInputDate(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function isEndTimeBeforeStartOnSameDay(
    startDate: string,
    endDate: string,
    startTime: string,
    endTime: string,
): boolean {
    if (!startTime || !endTime) return false;
    if (startDate && endDate && startDate !== endDate) return false;
    return endTime < startTime;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function VendorBimLeadTeamTasks() {
    const [searchParams] = useSearchParams();
    const projectFilter = searchParams.get("project");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    const [showCreateModal, setShowCreateModal] = useState(false);

    // Full-featured form (matching TeamtaskPMV)
    const emptyForm = {
        projectName: "",
        teamId: "",
        taskName: "",
        priority: "",
        actualStartDate: "",
        actualEndDate: "",
        startTime: "",
        dueTime: "",
        assignTo: "",
        description: "",
        checklist: "",
    };
    const [createForm, setCreateForm] = useState(emptyForm);
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // FormDropdown state
    const [openFormDropdown, setOpenFormDropdown] = useState<FormDropdownId>(null);
    const formProjectTriggerRef = useRef<HTMLButtonElement>(null);
    const formProjectMenuRef = useRef<HTMLDivElement>(null);
    const formTeamTriggerRef = useRef<HTMLButtonElement>(null);
    const formTeamMenuRef = useRef<HTMLDivElement>(null);
    const formPriorityTriggerRef = useRef<HTMLButtonElement>(null);
    const formPriorityMenuRef = useRef<HTMLDivElement>(null);
    const formAssignTriggerRef = useRef<HTMLButtonElement>(null);
    const formAssignMenuRef = useRef<HTMLDivElement>(null);

    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [openMenuTaskId, setOpenMenuTaskId] = useState<number | null>(null);

    // Status/filter state
    const [activeTab] = useState("All");

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.get<{ tasks?: Task[] }>("/api/vendors/vendor-tasks?condition=1"),
            api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects"),
            api.get<{ employees?: Employee[] }>("/api/employees"),
            api.get<{ teams?: Team[] }>("/api/vendors/vendor-teams"),
        ])
            .then(([tasksRes, projectsRes, empRes, teamsRes]) => {
                const raw = tasksRes.data.tasks ?? [];
                const mapped = raw.map((t) => ({
                    ...t,
                    assigned_to_name: t.assigned_to_name ?? t.assigned_full_name,
                    // Backend stores priority in `category`
                    priority: (t as any).priority ?? (t as any).category ?? t.priority,
                }));
                setTasks(mapped);
                setProjects(projectsRes.data.projects ?? []);
                setEmployees(empRes.data.employees ?? []);
                const normalizedTeams = (teamsRes.data.teams ?? []).map((t: Team) => ({
                    ...t,
                    id: (t as any).id ?? (t as any).team_id,
                    team_id: (t as any).team_id ?? (t as any).id,
                }));
                setTeams(normalizedTeams);
            })
            .catch(() => setTasks([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Click-outside for form dropdowns
    useEffect(() => {
        if (openFormDropdown === null) return;
        const handle = (e: MouseEvent) => {
            const target = e.target as Node;
            const refs: React.RefObject<HTMLElement | null>[] =
                openFormDropdown === "project"
                    ? [formProjectTriggerRef, formProjectMenuRef]
                    : openFormDropdown === "team"
                    ? [formTeamTriggerRef, formTeamMenuRef]
                    : openFormDropdown === "priority"
                    ? [formPriorityTriggerRef, formPriorityMenuRef]
                    : [formAssignTriggerRef, formAssignMenuRef];
            if (!refs.some((r) => r.current?.contains(target))) {
                setOpenFormDropdown(null);
            }
        };
        document.addEventListener("click", handle);
        return () => document.removeEventListener("click", handle);
    }, [openFormDropdown]);

    // Employees filtered by selected project members
    const employeesForAssignDropdown = useMemo(() => {
        const all = Array.isArray(employees) ? employees : [];
        const meta = projects.find((p) => p.project_name === createForm.projectName);
        const raw = (meta?.members || "").trim();
        if (!raw) return all;
        const tokens = raw.split(",").map((s) => s.trim()).filter(Boolean);
        if (tokens.length === 0) return all;
        return all.filter((emp) => {
            const name = (emp.full_name || "").trim();
            const idStr = String(emp.id);
            return tokens.some((t) => {
                const tl = t.toLowerCase();
                return t === idStr || tl === name.toLowerCase() || name === t;
            });
        });
    }, [employees, projects, createForm.projectName]);

    const modalAssignOptions = employeesForAssignDropdown
        .filter(isEmployeeActiveForProjectAssignment)
        .filter((e) => (e.full_name || "").trim() !== "")
        .map((e) => ({ value: e.full_name, label: e.full_name }));

    const modalProjectOptions = projects.map((p) => ({
        value: p.project_name,
        label: p.project_name,
    }));

    const modalTeamOptions = teams.map((t) => ({
        value: String((t as any).team_id ?? t.id),
        label: t.team_name,
    }));

    const todayInputDate = getTodayInputDate();
    const sameCalendarDay =
        Boolean(createForm.actualStartDate) &&
        Boolean(createForm.actualEndDate) &&
        createForm.actualStartDate === createForm.actualEndDate;

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const files = input.files;
        if (!files?.length) return;
        const newFiles = Array.from(files);
        setAttachmentFiles((prev) => {
            const merged = [...prev];
            for (const f of newFiles) {
                if (!merged.some((x) => x.name === f.name && x.size === f.size))
                    merged.push(f);
            }
            return merged;
        });
        input.value = "";
    };

    const removeAttachment = (index: number) => {
        setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const resetAndClose = () => {
        setShowCreateModal(false);
        setCreateForm(emptyForm);
        setAttachmentFiles([]);
        setOpenFormDropdown(null);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();

        if (createForm.actualStartDate && createForm.actualStartDate < todayInputDate) {
            toast.error("Start date cannot be before today.");
            return;
        }
        if (createForm.actualEndDate && createForm.actualEndDate < todayInputDate) {
            toast.error("End date cannot be before today.");
            return;
        }
        if (
            isEndTimeBeforeStartOnSameDay(
                createForm.actualStartDate,
                createForm.actualEndDate,
                createForm.startTime,
                createForm.dueTime,
            )
        ) {
            toast.error(
                "End time must be the same as or after start time when both dates are the same.",
            );
            return;
        }

        setCreateSubmitting(true);

        const projectId =
            projects.find((p) => p.project_name === createForm.projectName)?.id ?? null;
        const assigneeId = employees.find(
            (emp) => emp.full_name === createForm.assignTo,
        )?.id;
        const assignedToVal =
            assigneeId != null && !Number.isNaN(Number(assigneeId))
                ? assigneeId
                : createForm.assignTo;

        const payload = {
            task_name: createForm.taskName,
            description: createForm.description,
            status: "Todo",
            // Backend stores this in vendor_task.category
            category: createForm.priority || "Medium",
            due_date: createForm.actualEndDate,
            project_id: projectId ?? createForm.projectName,
            assigned_to: assignedToVal,
            // Store selected Team/Department in modules column
            modules: createForm.teamId || undefined,
            checklist: createForm.checklist,
            start_date: createForm.actualStartDate,
            start_time: createForm.startTime,
            due_time: createForm.dueTime,
        };

        api.post("/api/vendors/vendor-tasks", payload)
            .then((res) => {
                if (attachmentFiles.length > 0) {
                    const taskId = res.data?.task_id ?? res.data?.id;
                    if (taskId) {
                        const formData = new FormData();
                        attachmentFiles.forEach((f) => formData.append("image", f));
                        api.post(
                            `/api/vendors/vendor-tasks/${taskId}/output-files`,
                            formData,
                            {
                                headers: { "Content-Type": "multipart/form-data" },
                            },
                        );
                    }
                }
                resetAndClose();
                fetchData();
                toast.success("Task created successfully.");
            })
            .catch(() => toast.error("Failed to create task."))
            .finally(() => setCreateSubmitting(false));
    };

    const handleStatusChange = (taskId: number, newStatus: string) => {
        setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
        );
        const backendStatus =
            newStatus === "To Do"
                ? "Todo"
                : newStatus === "In Progress"
                    ? "InProgress"
                    : newStatus === "Completed"
                        ? "Completed"
                        : newStatus;
        api.patch(`/api/vendors/vendor-tasks/${taskId}/status`, {
            status: backendStatus,
        })
            .then(() => toast.success("Status updated"))
            .catch(() => {
                toast.error("Failed to update status");
                fetchData();
            });
    };

    const handleDelete = (taskId: number) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        api.delete(`/api/vendors/vendor-tasks/${taskId}`)
            .then(() => {
                setTasks((prev) => prev.filter((t) => t.id !== taskId));
                toast.success("Task deleted");
            })
            .catch(() => toast.error("Failed to delete task"));
    };

    const outlineEmployeeFilters = [
        "All Employees",
        ...new Set(tasks.map((t) => t.assigned_to_name).filter(Boolean)),
    ];
    const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState(
        "All Employees",
    );

    const filteredTasks = tasks.filter((t) => {
        const matchesStatus = activeTab === "All" || t.status === activeTab;
        const matchesEmployee =
            selectedEmployeeFilter === "All Employees" ||
            t.assigned_to_name === selectedEmployeeFilter;
        const matchesProject = !projectFilter || t.project_name === projectFilter;
        return matchesStatus && matchesEmployee && matchesProject;
    });

    const baseFilteredTasks = tasks.filter((t) => {
        const matchesEmployee =
            selectedEmployeeFilter === "All Employees" ||
            t.assigned_to_name === selectedEmployeeFilter;
        const matchesProject = !projectFilter || t.project_name === projectFilter;
        return matchesEmployee && matchesProject;
    });

    const statusOptions = ["Todo", "InProgress", "Completed"];
    const priorityColors: Record<string, string> = {
        High: "text-red-600 bg-red-50 border-red-100",
        Medium: "text-orange-600 bg-orange-50 border-orange-100",
        Low: "text-green-600 bg-green-50 border-green-100",
        Urgent: "text-purple-600 bg-purple-50 border-purple-100",
    };

    const resolveTeamName = (modulesValue?: string): string => {
        if (!modulesValue) return "General Team";
        // We store teamId (or teamId as string) in `vendor_task.modules`.
        const maybeId = Number(modulesValue);
        if (!Number.isNaN(maybeId)) {
            const team = teams.find((t) => Number((t as any).id ?? (t as any).team_id) === maybeId);
            return team?.team_name || "General Team";
        }
        return modulesValue;
    };

    const normalizeStatus = (
        s: string | undefined,
    ): "todo" | "in_progress" | "completed" => {
        if (!s) return "todo";
        const lower = s.toLowerCase().replace(/\s+/g, "_");
        if (lower.includes("progress") || lower === "in_progress") return "in_progress";
        if (lower.includes("complete") || lower === "done") return "completed";
        return "todo";
    };

    const counts = {
        todo: baseFilteredTasks.filter(
            (t) => normalizeStatus(t.status) === "todo",
        ).length,
        in_progress: baseFilteredTasks.filter(
            (t) => normalizeStatus(t.status) === "in_progress",
        ).length,
        completed: baseFilteredTasks.filter(
            (t) => normalizeStatus(t.status) === "completed",
        ).length,
    };

    const displayedTasksByStatus = {
        todo: filteredTasks.filter((t) => normalizeStatus(t.status) === "todo"),
        in_progress: filteredTasks.filter(
            (t) => normalizeStatus(t.status) === "in_progress",
        ),
        completed: filteredTasks.filter(
            (t) => normalizeStatus(t.status) === "completed",
        ),
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
            </div>
        );
    }

    return (
        <div className="h-full min-h-0 flex flex-col overflow-hidden bg-white font-gantari">
            <div className="bg-white pb-3 flex-shrink-0 px-6 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <h2 className="text-[24px] font-semibold text-slate-800">
                        Team Tasks
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                value={selectedEmployeeFilter}
                                onChange={(e) =>
                                    setSelectedEmployeeFilter(e.target.value)
                                }
                                className="appearance-none rounded-md bg-[#E8E8E8] px-4 py-2 pr-8 text-sm text-[#353535] cursor-pointer"
                            >
                                {outlineEmployeeFilters.map((e) => (
                                    <option key={e} value={e}>
                                        {e}
                                    </option>
                                ))}
                            </select>
                            <img
                                src={ArrowDown}
                                alt="arrow"
                                className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2"
                            />
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#DD4342] px-4 py-2 text-sm font-medium text-white shadow-sm cursor-pointer"
                        >
                            <img src={AddBtn} alt="Add" className="h-5 w-5" />
                            AddTask
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative bg-white border-slate-200">
                        <span className="text-xl font-bold text-[#0D1829]">To Do</span>
                        <span className="text-xl font-bold text-[#0D1829]">
                            ({counts.todo})
                        </span>
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                            <img src={Group1} alt="Group1" className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative bg-white border-slate-200">
                        <span className="text-xl font-bold text-[#0D1829]">
                            In Progress
                        </span>
                        <span className="text-xl font-bold text-[#0D1829]">
                            ({counts.in_progress})
                        </span>
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                            <img src={Group2} alt="Group2" className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex p-4 gap-4 rounded-xl border py-4 shadow-sm relative bg-white border-slate-200">
                        <span className="text-xl font-bold text-[#0D1829]">
                            Completed
                        </span>
                        <span className="text-xl font-bold text-[#0D1829]">
                            ({counts.completed})
                        </span>
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center justify-center">
                            <img src={Group3} alt="Group3" className="w-8 h-8" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(["todo", "in_progress", "completed"] as const).map((bucket) => (
                        <div
                            key={bucket}
                            className="space-y-3 min-h-[120px] rounded-lg p-1"
                        >
                            {displayedTasksByStatus[bucket].map((task) => (
                                <div
                                    key={task.id}
                                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm relative"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#DD4342] bg-red-50 px-2.5 py-1 rounded-md mb-2 inline-block">
                                                {resolveTeamName(task.modules)}
                                            </span>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                                {task.project_name || "Internal"}
                                            </p>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() =>
                                                    setOpenMenuTaskId(
                                                        openMenuTaskId === task.id
                                                            ? null
                                                            : task.id,
                                                    )
                                                }
                                                className="p-0.5 rounded cursor-pointer"
                                            >
                                                <img
                                                    src={Dot}
                                                    alt="Dot"
                                                    className="w-4 h-4"
                                                />
                                            </button>
                                            {openMenuTaskId === task.id && (
                                                <div className="absolute top-full mt-1 right-0 z-50 min-w-[150px] bg-white/20 backdrop-blur-md rounded-xl border border-[#59595980] shadow-xl">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTask(task);
                                                            setShowViewModal(true);
                                                            setOpenMenuTaskId(null);
                                                        }}
                                                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#616161] hover:text-[#DD4342] cursor-pointer"
                                                    >
                                                        <img
                                                            src={viewIcon}
                                                            alt="view"
                                                            className="w-4 h-4"
                                                        />
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setOpenMenuTaskId(null)
                                                        }
                                                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#616161] hover:text-[#DD4342] cursor-pointer"
                                                    >
                                                        <img
                                                            src={editIcon}
                                                            alt="edit"
                                                            className="w-4 h-4"
                                                        />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleDelete(task.id);
                                                            setOpenMenuTaskId(null);
                                                        }}
                                                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#616161] hover:text-[#DD4342] cursor-pointer"
                                                    >
                                                        <img
                                                            src={deleteIcon}
                                                            alt="delete"
                                                            className="w-4 h-4"
                                                        />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                        {task.task_name}
                                    </h3>
                                    <div className="flex items-center gap-3 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <div className="w-8 h-8 rounded-full bg-[#DD4342] text-white flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0">
                                            {(task.assigned_to_name || "?")[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                                                Assigned To
                                            </p>
                                            <p className="text-sm font-bold text-[#1A1A1A] truncate">
                                                {task.assigned_to_name || "Unassigned"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${priorityColors[task.priority] || "text-gray-600 bg-gray-50 border-gray-100"}`}
                                            >
                                                {task.priority || "Medium"}
                                            </div>
                                            {task.due_date && (
                                                <span className="text-xs font-semibold text-gray-400">
                                                    {new Date(
                                                        task.due_date,
                                                    ).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <select
                                            value={task.status}
                                            onChange={(e) =>
                                                handleStatusChange(
                                                    task.id,
                                                    e.target.value,
                                                )
                                            }
                                            className="text-[11px] font-bold bg-[#F2F2F2] border-none rounded-lg px-2 py-1 outline-none cursor-pointer"
                                        >
                                            {statusOptions.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                            {displayedTasksByStatus[bucket].length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                    No team tasks found for the current filters.
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Add Task Modal (PMV-style) ─────────────────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-[#FFFFFF] rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <button
                                type="button"
                                onClick={resetAndClose}
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
                                Add New Task
                            </h3>
                            <div className="w-9" />
                        </div>

                        {/* Form */}
                        <form
                            className="flex-1 overflow-y-auto p-6 custom-scrollbar"
                            onSubmit={handleCreate}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Project – full width */}
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Project
                                    </label>
                                    <FormDropdown
                                        label="Select Project"
                                        options={[
                                            { value: "", label: "Select Project" },
                                            ...modalProjectOptions,
                                        ]}
                                        value={createForm.projectName}
                                        onChange={(v) =>
                                            setCreateForm((f) => ({
                                                ...f,
                                                projectName: v,
                                                assignTo: "",
                                            }))
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
                                    />
                                </div>

                                {/* Team/Department */}
                                <div>
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Team/Department
                                    </label>
                                    <FormDropdown
                                        label="Select Team"
                                        options={[
                                            { value: "", label: "Select Team" },
                                            ...modalTeamOptions,
                                        ]}
                                        value={createForm.teamId}
                                        onChange={(v) =>
                                            setCreateForm((f) => ({ ...f, teamId: v }))
                                        }
                                        isOpen={openFormDropdown === "team"}
                                        onToggle={() =>
                                            setOpenFormDropdown((d) =>
                                                d === "team" ? null : "team",
                                            )
                                        }
                                        onClose={() => setOpenFormDropdown(null)}
                                        triggerRef={formTeamTriggerRef}
                                        dropdownRef={formTeamMenuRef}
                                    />
                                </div>

                                {/* Task Name */}
                                <div>
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Task Name *
                                    </label>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            required
                                            value={createForm.taskName}
                                            onChange={(e) =>
                                                setCreateForm((f) => ({
                                                    ...f,
                                                    taskName: e.target.value,
                                                }))
                                            }
                                            placeholder="Enter task name"
                                            className="flex-1 rounded-l-sm rounded-r-none bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            className="rounded-l-none rounded-r-sm bg-[#E2E2E2] px-4 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50 cursor-pointer"
                                        >
                                            Tasklist
                                        </button>
                                    </div>
                                </div>

                                {/* Priority | Actual Start Date | Actual End Date */}
                                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Priority
                                        </label>
                                        <FormDropdown
                                            label="Select Type"
                                            options={[
                                                { value: "", label: "Priority" },
                                                { value: "Low", label: "Low" },
                                                { value: "Medium", label: "Medium" },
                                                { value: "High", label: "High" },
                                                { value: "Urgent", label: "Urgent" },
                                            ]}
                                            value={createForm.priority}
                                            onChange={(v) =>
                                                setCreateForm((f) => ({
                                                    ...f,
                                                    priority: v,
                                                }))
                                            }
                                            isOpen={openFormDropdown === "priority"}
                                            onToggle={() =>
                                                setOpenFormDropdown((d) =>
                                                    d === "priority" ? null : "priority",
                                                )
                                            }
                                            onClose={() => setOpenFormDropdown(null)}
                                            triggerRef={formPriorityTriggerRef}
                                            dropdownRef={formPriorityMenuRef}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Actual Start Date
                                        </label>
                                        <input
                                            type="date"
                                            min={todayInputDate}
                                            value={createForm.actualStartDate}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setCreateForm((f) => {
                                                    const next = {
                                                        ...f,
                                                        actualStartDate: v,
                                                    };
                                                    if (
                                                        f.actualEndDate &&
                                                        v &&
                                                        f.actualEndDate < v
                                                    ) {
                                                        next.actualEndDate = v;
                                                    }
                                                    return next;
                                                });
                                            }}
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
                                            min={
                                                createForm.actualStartDate ||
                                                todayInputDate
                                            }
                                            value={createForm.actualEndDate}
                                            onChange={(e) =>
                                                setCreateForm((f) => ({
                                                    ...f,
                                                    actualEndDate: e.target.value,
                                                }))
                                            }
                                            placeholder="dd/mm/yyyy"
                                            className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Select Start Time | Select Due Time | Assign To */}
                                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Select Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={createForm.startTime}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setCreateForm((f) => {
                                                    const next = { ...f, startTime: v };
                                                    const same =
                                                        f.actualStartDate &&
                                                        f.actualEndDate &&
                                                        f.actualStartDate ===
                                                            f.actualEndDate;
                                                    if (
                                                        same &&
                                                        f.dueTime &&
                                                        v &&
                                                        f.dueTime < v
                                                    ) {
                                                        next.dueTime = v;
                                                    }
                                                    return next;
                                                });
                                            }}
                                            placeholder="hh:mm"
                                            className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Select Due Time
                                        </label>
                                        <input
                                            type="time"
                                            min={
                                                sameCalendarDay && createForm.startTime
                                                    ? createForm.startTime
                                                    : undefined
                                            }
                                            value={createForm.dueTime}
                                            onChange={(e) =>
                                                setCreateForm((f) => ({
                                                    ...f,
                                                    dueTime: e.target.value,
                                                }))
                                            }
                                            placeholder="hh:mm"
                                            className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-1">
                                            Assign To
                                        </label>
                                        <FormDropdown
                                            label="Select Assign To"
                                            options={[
                                                {
                                                    value: "",
                                                    label: "Select Assign To",
                                                },
                                                ...modalAssignOptions,
                                            ]}
                                            value={createForm.assignTo}
                                            onChange={(v) =>
                                                setCreateForm((f) => ({
                                                    ...f,
                                                    assignTo: v,
                                                }))
                                            }
                                            isOpen={openFormDropdown === "assignTo"}
                                            onToggle={() =>
                                                setOpenFormDropdown((d) =>
                                                    d === "assignTo"
                                                        ? null
                                                        : "assignTo",
                                                )
                                            }
                                            onClose={() => setOpenFormDropdown(null)}
                                            triggerRef={formAssignTriggerRef}
                                            dropdownRef={formAssignMenuRef}
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={createForm.description}
                                        onChange={(e) =>
                                            setCreateForm((f) => ({
                                                ...f,
                                                description: e.target.value,
                                            }))
                                        }
                                        placeholder="Enter Description..."
                                        rows={3}
                                        className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                    />
                                </div>

                                {/* Checklist */}
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Checklist
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.checklist}
                                        onChange={(e) =>
                                            setCreateForm((f) => ({
                                                ...f,
                                                checklist: e.target.value,
                                            }))
                                        }
                                        placeholder="Enter Reference Link"
                                        className="w-full rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-black focus:outline-none"
                                    />
                                </div>

                                {/* Attachments */}
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-black mb-1">
                                        Attachments
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        id="bl-add-task-file-input"
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
                                                        ? `${attachmentFiles.length} file(s) selected`
                                                        : ""
                                                }
                                                placeholder="Upload Files"
                                                className="flex-1 rounded-l-sm rounded-r-none bg-[#F2F3F4] px-3 py-2 text-sm text-[#101827] placeholder:text-[#8B8B8B] focus:outline-none truncate"
                                                title={
                                                    attachmentFiles.length > 0
                                                        ? attachmentFiles
                                                              .map((f) => f.name)
                                                              .join(", ")
                                                        : undefined
                                                }
                                            />
                                            <label
                                                htmlFor="bl-add-task-file-input"
                                                className="rounded-r-sm rounded-l-none bg-[#E2E2E2] px-4 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50 cursor-pointer inline-flex items-center"
                                            >
                                                Browse File
                                            </label>
                                        </div>
                                    </div>
                                    {attachmentFiles.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {attachmentFiles.map((file, index) => (
                                                <li
                                                    key={`${file.name}-${index}`}
                                                    className="flex items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-sm text-[#101827]"
                                                >
                                                    <span
                                                        className="truncate min-w-0"
                                                        title={file.name}
                                                    >
                                                        {file.name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeAttachment(index)
                                                        }
                                                        className="ml-2 shrink-0 p-0.5 rounded text-black hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
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
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Footer buttons */}
                            <div className="flex justify-center gap-3 mt-6 pt-4">
                                <button
                                    type="button"
                                    onClick={resetAndClose}
                                    className="rounded-lg bg-[#F2F2F2] px-5 py-2 text-sm font-medium text-[#8B8B8B] hover:bg-slate-50 cursor-pointer"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={createSubmitting}
                                    className="rounded-lg bg-[#DBE9FE] px-5 py-2 text-sm font-medium text-[#101827] hover:bg-[#D5E6FF] disabled:opacity-50 cursor-pointer"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── View Task Modal ────────────────────────────────────────── */}
            {showViewModal && selectedTask && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-[500px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[10px] font-bold text-[#DD4342] bg-red-50 px-2 py-1 rounded mb-2 inline-block uppercase tracking-wider">
                                        {resolveTeamName(selectedTask?.modules)}
                                    </span>
                                    <h3 className="text-2xl font-bold text-[#1A1A1A]">
                                        {selectedTask.task_name}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors bg-[#F2F2F2] cursor-pointer"
                                >
                                    <svg
                                        className="w-6 h-6 text-gray-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2.5}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <div className="space-y-6">
                                <div className="flex flex-wrap gap-4">
                                    <div className="bg-[#F8FAFC] rounded-xl p-4 flex-1 min-w-[150px]">
                                        <span className="text-xs font-bold text-gray-400 block mb-1 uppercase">
                                            Status
                                        </span>
                                        <span className="font-bold text-[#1A1A1A]">
                                            {selectedTask.status}
                                        </span>
                                    </div>
                                    <div className="bg-[#F8FAFC] rounded-xl p-4 flex-1 min-w-[150px]">
                                        <span className="text-xs font-bold text-gray-400 block mb-1 uppercase">
                                            Priority
                                        </span>
                                        <span
                                            className={`font-bold ${selectedTask.priority === "High" ? "text-red-500" : "text-[#1A1A1A]"}`}
                                        >
                                            {selectedTask.priority}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#DD4342] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                        {(selectedTask.assigned_to_name || "?")[0]}
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 block mb-0.5 uppercase tracking-widest">
                                            Assigned To
                                        </span>
                                        <span className="font-bold text-[#1A1A1A]">
                                            {selectedTask.assigned_to_name ||
                                                "Unassigned"}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-400 block mb-2 uppercase">
                                        Description
                                    </span>
                                    <p className="text-[#6B7280] leading-relaxed bg-gray-50 p-4 rounded-xl text-sm italic">
                                        {selectedTask.description ||
                                            "No description available."}
                                    </p>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button
                                        onClick={() => setShowViewModal(false)}
                                        className="px-8 py-2.5 bg-[#DD4342] text-white rounded-xl font-bold hover:bg-[#DD4342]/90 shadow-lg shadow-red-100 transition-all font-gantari cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}