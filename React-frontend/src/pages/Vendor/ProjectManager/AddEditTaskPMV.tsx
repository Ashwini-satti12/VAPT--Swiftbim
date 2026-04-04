import { useEffect, useState, useRef, useMemo } from "react";
import {
  useSearchParams,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import api from "../../../lib/api";
import toast from "react-hot-toast";
import ArrowDown from "../../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import backIcon from "../../../assets/TechnicalDirector/back icon.svg";
import { isEmployeeActiveForProjectAssignment } from "../../../utils/employeeActive";

type FormDropdownId = "project" | "module" | "type" | "assignTo" | null;

interface Employee {
  id: number;
  full_name?: string;
  name?: string;
  active?: string | null;
}

interface Project {
  id: number;
  project_name: string;
  modules?: string;
  members?: string;
  members_names?: string[];
}

interface Task {
  id: number;
  task_name?: string;
  projectid?: number;
  project_id?: number;
  status?: string;
  due_date?: string;
  project_name?: string;
  start_date?: string;
  module?: string;
  modules_name?: string;
  type?: string;
  start_time?: string;
  due_time?: string;
  assign_to?: string;
  description?: string;
  checklist?: string;
  assigned_full_name?: string;
  assigned_to?: number;
  Actual_start_time?: string;
  perferstart_time?: string;
  perferend_time?: string;
}

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
        className="flex w-full items-center justify-between rounded-sm bg-[#F2F3F4] px-3 py-2 text-left text-[14px] cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${value ? "text-[#353535]" : "text-[#8B8B8B]"}`}>
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
          className="absolute top-full left-0 z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  onClose();
                }}
                className="block w-full px-3 py-2 text-left text-[14px] text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
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

function toInputDate(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  return "";
}

function taskToFormValues(task: Task | Record<string, unknown>) {
  const t = task as Record<string, unknown>;
  const str = (v: unknown) => (v != null ? String(v) : "");
  const timeOnly = (v: unknown) => {
    if (v == null) return "";
    const s = str(v);
    const match = s.match(/(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, "0")}:${match[2]}` : s.slice(0, 5);
  };
  return {
    projectName: str(t.project_name ?? t.projectName ?? ""),
    module: str(t.module ?? t.modules_name ?? t.modules ?? ""),
    taskName: str(t.task_name ?? t.taskName ?? ""),
    type: str(t.type ?? t.category ?? ""),
    actualStartDate: toInputDate(t.start_date ?? t.startDate ?? t.Actual_start_time ?? ""),
    actualEndDate: toInputDate(t.due_date ?? t.dueDate ?? ""),
    startTime: timeOnly(t.start_time ?? t.perferstart_time ?? t.Actual_start_time ?? ""),
    dueTime: timeOnly(t.due_time ?? t.perferend_time ?? t.end_time ?? ""),
    assignTo: str(t.assign_to ?? t.assigned_full_name ?? ""),
    description: str(t.description ?? ""),
    checklist: str(t.checklist ?? ""),
  };
}

export default function AddEditTaskPMV() {
  const { id: idParam } = useParams();
  const [searchParams] = useSearchParams();
  const { pathname, state: locationState } = useLocation();
  const navigate = useNavigate();

  const editingTaskId = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null;
  // If no ID param, check if task is passed in state (for backwards compatibility if needed)
  const taskFromState = (locationState as { task?: Task } | null)?.task;
  const activeTaskId = editingTaskId ?? taskFromState?.id ?? null;
  const isEdit = activeTaskId !== null;

  const listQs = useMemo(() => {
    const s = searchParams.toString();
    return s ? `?${s}` : "";
  }, [searchParams]);

  const listBasePath = pathname.includes("/vpm/teamtasks") ? "/vpm/teamtasks" : "/vpm/mytasks";
  const goBackToList = () => navigate(`${listBasePath}${listQs}`);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [formReady, setFormReady] = useState(!isEdit);

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
  
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [openFormDropdown, setOpenFormDropdown] = useState<FormDropdownId>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formProjectTriggerRef = useRef<HTMLButtonElement>(null);
  const formProjectMenuRef = useRef<HTMLDivElement>(null);
  const formModuleTriggerRef = useRef<HTMLButtonElement>(null);
  const formModuleMenuRef = useRef<HTMLDivElement>(null);
  const formTypeTriggerRef = useRef<HTMLButtonElement>(null);
  const formTypeMenuRef = useRef<HTMLDivElement>(null);
  const formAssignTriggerRef = useRef<HTMLButtonElement>(null);
  const formAssignMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ resources?: Employee[] }>("/api/vendors/vendor-resource-profiles"),
      api.get<{ projects?: Project[] }>("/api/vendors/vendor-projects", { params: { all: "1" } }),
    ]).then(([resRes, projRes]) => {
      setEmployees(resRes.data.resources ?? []);
      setProjects(projRes.data.projects ?? []);
    }).catch(console.error).finally(() => setLoadingMeta(false));
  }, []);

  useEffect(() => {
    if (!isEdit || loadingMeta) return;
    if (taskFromState && taskFromState.id === activeTaskId) {
      setAddTaskForm(taskToFormValues(taskFromState));
      setFormReady(true);
      return;
    }
    // Otherwise fetch
    api.get(`/api/tasks/${activeTaskId}`)
      .then(res => {
        const raw = (res.data as any).task ?? res.data;
        setAddTaskForm(taskToFormValues(raw));
      })
      .catch(() => toast.error("Failed to load task"))
      .finally(() => setFormReady(true));
  }, [isEdit, activeTaskId, loadingMeta, taskFromState]);

  useEffect(() => {
    if (openFormDropdown === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const refs = openFormDropdown === "project" ? [formProjectTriggerRef, formProjectMenuRef] :
                   openFormDropdown === "module" ? [formModuleTriggerRef, formModuleMenuRef] :
                   openFormDropdown === "type" ? [formTypeTriggerRef, formTypeMenuRef] :
                   [formAssignTriggerRef, formAssignMenuRef];
      if (!refs.some(r => r.current?.contains(target))) setOpenFormDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openFormDropdown]);

  const selectedProjectMeta = projects.find(p => p.project_name === addTaskForm.projectName);
  const dynamicModuleOptions = (selectedProjectMeta?.modules || "").split(",").map(m => m.trim()).filter(Boolean);
  
  const employeesForAssignDropdown = useMemo(() => {
    const all = employees.filter(isEmployeeActiveForProjectAssignment);
    if (!selectedProjectMeta?.members) return all;
    const tokens = selectedProjectMeta.members.split(",").map(s => s.trim().toLowerCase());
    return all.filter(emp => {
        const idStr = String(emp.id);
        const name = (emp.full_name || emp.name || "").toLowerCase();
        return tokens.includes(idStr) || tokens.includes(name);
    });
  }, [employees, selectedProjectMeta]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find(p => p.project_name === addTaskForm.projectName);
    const emp = employees.find(e => (e.full_name || e.name) === addTaskForm.assignTo);

    const payload = {
      projectid: proj?.id ?? addTaskForm.projectName,
      taskName: addTaskForm.taskName,
      category: addTaskForm.type,
      startdate: addTaskForm.actualStartDate,
      dueDate: addTaskForm.actualEndDate,
      startTime: addTaskForm.startTime,
      dueTime: addTaskForm.dueTime,
      assignedTo: emp?.id ?? addTaskForm.assignTo,
      description: addTaskForm.description,
      checklist: addTaskForm.checklist,
      modules: addTaskForm.module,
    };

    const promise = isEdit 
      ? api.patch(`/api/tasks/${activeTaskId}`, {
          task_name: addTaskForm.taskName,
          assigned_to: emp?.id ?? addTaskForm.assignTo,
          due_date: addTaskForm.actualEndDate,
          category: addTaskForm.type,
          description: addTaskForm.description,
          checklist: addTaskForm.checklist,
          modules_name: addTaskForm.module,
          Actual_start_time: addTaskForm.actualStartDate,
          perferstart_time: addTaskForm.startTime,
          perferend_time: addTaskForm.dueTime,
        })
      : api.post("/api/tasks", payload);

    promise.then(() => {
      toast.success(isEdit ? "Task updated" : "Task created");
      goBackToList();
    }).catch(() => toast.error("Operation failed"));
  };

  if (loadingMeta || (isEdit && !formReady)) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden font-Gantari">
      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-slate-100">
        <button onClick={goBackToList} className="p-2 rounded bg-slate-100 cursor-pointer">
          <img src={backIcon} alt="Back" className="w-5 h-5" />
        </button>
        <h1 className="text-[24px] font-semibold text-[#353535]">
          {isEdit ? "Edit Task" : "Add Task"}
        </h1>
        <div className="w-9" />
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="md:col-span-2">
                <label className="block text-[16px] font-medium text-[#353535] mb-2">Project Name</label>
                <FormDropdown
                  label="Select Project"
                  options={projects.map(p => ({ value: p.project_name, label: p.project_name }))}
                  value={addTaskForm.projectName}
                  onChange={v => setAddTaskForm(f => ({ ...f, projectName: v, module: "", assignTo: "" }))}
                  isOpen={openFormDropdown === "project"}
                  onToggle={() => setOpenFormDropdown(d => d === "project" ? null : "project")}
                  onClose={() => setOpenFormDropdown(null)}
                  triggerRef={formProjectTriggerRef}
                  dropdownRef={formProjectMenuRef}
                />
             </div>
             
             <div>
                <label className="block text-[16px] font-medium text-[#353535] mb-2">Module</label>
                <FormDropdown
                  label="Select Module"
                  options={dynamicModuleOptions.map(m => ({ value: m, label: m }))}
                  value={addTaskForm.module}
                  onChange={v => setAddTaskForm(f => ({ ...f, module: v }))}
                  isOpen={openFormDropdown === "module"}
                  onToggle={() => setOpenFormDropdown(d => d === "module" ? null : "module")}
                  onClose={() => setOpenFormDropdown(null)}
                  triggerRef={formModuleTriggerRef}
                  dropdownRef={formModuleMenuRef}
                />
             </div>

             <div>
                <label className="block text-[16px] font-medium text-[#353535] mb-2">Task Name</label>
                <input
                  type="text"
                  value={addTaskForm.taskName}
                  onChange={e => setAddTaskForm(f => ({ ...f, taskName: e.target.value }))}
                  placeholder="Enter task name"
                  className="w-full bg-[#F2F3F4] px-4 py-2 rounded-sm border-0 focus:ring-1 focus:ring-slate-300 outline-none text-[14px]"
                />
             </div>

             <div>
                <label className="block text-[16px] font-medium text-[#353535] mb-2">Type</label>
                <FormDropdown
                  label="Select Type"
                  options={[{ value: "task", label: "Task" }, { value: "bug", label: "Bug" }, { value: "rework", label: "Rework" }]}
                  value={addTaskForm.type}
                  onChange={v => setAddTaskForm(f => ({ ...f, type: v }))}
                  isOpen={openFormDropdown === "type"}
                  onToggle={() => setOpenFormDropdown(d => d === "type" ? null : "type")}
                  onClose={() => setOpenFormDropdown(null)}
                  triggerRef={formTypeTriggerRef}
                  dropdownRef={formTypeMenuRef}
                />
             </div>

             <div>
                <label className="block text-[16px] font-medium text-[#353535] mb-2">Assign To</label>
                <FormDropdown
                  label="Select Assignee"
                  options={employeesForAssignDropdown.map(e => ({ value: e.full_name || e.name || "", label: e.full_name || e.name || "" }))}
                  value={addTaskForm.assignTo}
                  onChange={v => setAddTaskForm(f => ({ ...f, assignTo: v }))}
                  isOpen={openFormDropdown === "assignTo"}
                  onToggle={() => setOpenFormDropdown(d => d === "assignTo" ? null : "assignTo")}
                  onClose={() => setOpenFormDropdown(null)}
                  triggerRef={formAssignTriggerRef}
                  dropdownRef={formAssignMenuRef}
                />
             </div>

             <div>
                <label className="block text-[16px] font-medium text-[#353535] mb-2">Start Date</label>
                <input
                  type="date"
                  value={addTaskForm.actualStartDate}
                  onChange={e => setAddTaskForm(f => ({ ...f, actualStartDate: e.target.value }))}
                  className="w-full bg-[#F2F3F4] px-4 py-2 rounded-sm border-0 focus:ring-1 focus:ring-slate-300 outline-none text-[14px]"
                />
             </div>

             <div>
                <label className="block text-[16px] font-medium text-[#353535] mb-2">Due Date</label>
                <input
                  type="date"
                  value={addTaskForm.actualEndDate}
                  onChange={e => setAddTaskForm(f => ({ ...f, actualEndDate: e.target.value }))}
                  className="w-full bg-[#F2F3F4] px-4 py-2 rounded-sm border-0 focus:ring-1 focus:ring-slate-300 outline-none text-[14px]"
                />
             </div>

             <div>
                <label className="block text-[16px] font-medium text-[#353535] mb-2">Start Time</label>
                <input
                  type="time"
                  value={addTaskForm.startTime}
                  onChange={e => setAddTaskForm(f => ({ ...f, startTime: e.target.value }))}
                  className="w-full bg-[#F2F3F4] px-4 py-2 rounded-sm border-0 focus:ring-1 focus:ring-slate-300 outline-none text-[14px]"
                />
             </div>

             <div>
                <label className="block text-[16px] font-medium text-[#353535] mb-2">Due Time</label>
                <input
                  type="time"
                  value={addTaskForm.dueTime}
                  onChange={e => setAddTaskForm(f => ({ ...f, dueTime: e.target.value }))}
                  className="w-full bg-[#F2F3F4] px-4 py-2 rounded-sm border-0 focus:ring-1 focus:ring-slate-300 outline-none text-[14px]"
                />
             </div>
          </div>

          <div>
             <label className="block text-[16px] font-medium text-[#353535] mb-2">Description</label>
             <textarea
               value={addTaskForm.description}
               onChange={e => setAddTaskForm(f => ({ ...f, description: e.target.value }))}
               rows={4}
               className="w-full bg-[#F2F3F4] px-4 py-2 rounded-sm border-0 focus:ring-1 focus:ring-slate-300 outline-none text-[14px] resize-none"
             />
          </div>

          <div className="flex justify-center gap-4 pt-6">
             <button type="button" onClick={goBackToList} className="px-8 py-2 rounded-md bg-[#F2F2F2] text-[#8B8B8B] font-medium cursor-pointer">Discard</button>
             <button type="submit" className="px-8 py-2 rounded-md bg-[#DBE9FE] text-[#000000] font-medium cursor-pointer">Submit</button>
          </div>
        </div>
      </form>
    </div>
  );
}
