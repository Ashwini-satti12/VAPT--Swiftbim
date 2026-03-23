import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../lib/api";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import { TimePickerWheel } from "../../components/TimePickerWheel";
import { AttachmentPreviewModal } from "../../components/AttachmentPreviewModal";
import {
    formatTimeForDisplay,
    FormDropdown,
    TaskDropdown,
    AttachmentPreviewItem,
    taskToFormValues,
    type FormDropdownId,
    type Task,
    type Employee,
    type Project,
} from "./MytaskBC";

const initialForm = {
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
};

export default function AddTaskBC() {
    const navigate = useNavigate();
    const location = useLocation();
    const editingTask = location.state?.task as Task | undefined;
    const editingTaskId = editingTask?.id ?? null;

    const [list, setList] = useState<Task[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [addTaskForm, setAddTaskForm] = useState(initialForm);
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const [openFormDropdown, setOpenFormDropdown] = useState<FormDropdownId>(null);
    const [tasklistOpen, setTasklistOpen] = useState(false);
    const [attachmentPreviewFile, setAttachmentPreviewFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
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
    const tasklistTriggerRef = useRef<HTMLButtonElement>(null);
    const tasklistMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        Promise.all([
            api.get<{ tasks?: Task[] }>("/api/tasks"),
            api.get<{ employees?: Employee[] }>("/api/employees"),
            api.get<{ projects?: Project[] }>("/api/projects"),
        ]).then(([tasksRes, empRes, projRes]) => {
            setList(tasksRes.data.tasks ?? []);
            setEmployees(empRes.data.employees ?? []);
            setProjects(projRes.data.projects ?? []);
        });
    }, []);

    useEffect(() => {
        if (editingTask) {
            setAddTaskForm(taskToFormValues(editingTask));
        }
    }, [editingTask]);

    useEffect(() => {
        if (openFormDropdown === null && !tasklistOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const refs: React.RefObject<HTMLElement | null>[] =
                tasklistOpen
                    ? [tasklistTriggerRef, tasklistMenuRef]
                    : openFormDropdown === "project"
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
            if (!inside) {
                setOpenFormDropdown(null);
                setTasklistOpen(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [openFormDropdown, tasklistOpen]);

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.currentTarget.files;
        if (!files?.length) return;
        setAttachmentFiles((prev) => [...prev, ...Array.from(files)]);
        e.currentTarget.value = "";
    };

    const removeAttachment = (index: number) => {
        setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const merged = list.filter(Boolean);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            projectid: projects.find((p) => p.project_name === addTaskForm.projectName)?.id || addTaskForm.projectName,
            taskName: addTaskForm.taskName,
            category: addTaskForm.type,
            startdate: addTaskForm.actualStartDate,
            dueDate: addTaskForm.actualEndDate,
            startTime: addTaskForm.startTime,
            dueTime: addTaskForm.dueTime,
            assignedTo: employees.find((e) => e.full_name === addTaskForm.assignTo)?.id || addTaskForm.assignTo,
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

        if (editingTaskId != null) {
            api
                .patch(`/api/tasks/${editingTaskId}`, {
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
                    handleFiles(editingTaskId);
                    navigate(location.state?.from === "teamtasks" ? "/bc/teamtasks" : "/bc/mytasks");
                });
        } else {
            api.post("/api/tasks", payload).then((res) => {
                if (res.data.success && res.data.task_id) {
                    handleFiles(res.data.task_id);
                    navigate(location.state?.from === "teamtasks" ? "/bc/teamtasks" : "/bc/mytasks");
                }
            });
        }
    };

    const fromTeamTasks = location.state?.from === "teamtasks";
    const goBack = () => navigate(fromTeamTasks ? "/bc/teamtasks" : "/bc/mytasks");

    return (
        <div className="flex-1 overflow-y-auto p-2 bg-white">
            <div className="max-w-[1174px] mx-auto">
                <div className="flex items-center justify-between mb-8 sm:mb-10 relative">
                    <button
                        type="button"
                        onClick={goBack}
                        className="p-2 rounded-lg bg-[#F4F4F4] text-[#1A1A1A] transition-all"
                        title="Back"
                    >
                        <img src={backIcon} alt="Back" className="w-5 h-5" />
                    </button>
                    <h3 className="text-[20px] sm:text-[24px] font-semibold text-[#020202] font-Gantari text-center flex-1">
                        {editingTaskId !== null ? "Edit Task" : "Add New Task"}
                    </h3>
                    <div className="w-10" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                        <div className="md:col-span-2">
                            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Project Name</label>
                            <FormDropdown
                                label="Select Project name"
                                options={[
                                    { value: "", label: "Select Project name" },
                                    ...projects.map((p) => ({ value: p.project_name, label: p.project_name })),
                                ]}
                                value={addTaskForm.projectName}
                                onChange={(v) => setAddTaskForm((f) => ({ ...f, projectName: v }))}
                                isOpen={openFormDropdown === "project"}
                                onToggle={() => setOpenFormDropdown((d) => (d === "project" ? null : "project"))}
                                onClose={() => setOpenFormDropdown(null)}
                                triggerRef={formProjectTriggerRef}
                                dropdownRef={formProjectMenuRef}
                                searchable
                            />
                        </div>
                        <div>
                            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Select Module</label>
                            <FormDropdown
                                label="Select Module"
                                options={[
                                    { value: "", label: "Select Module" },
                                    ...(projects.find((p) => p.project_name === addTaskForm.projectName)?.modules
                                        ? (projects
                                              .find((p) => p.project_name === addTaskForm.projectName)!
                                              .modules!.split(",")
                                              .map((m) => m.trim())
                                              .filter(Boolean)
                                              .map((m) => ({ value: m, label: m })) as { value: string; label: string }[])
                                        : []),
                                ]}
                                value={addTaskForm.module}
                                onChange={(v) => setAddTaskForm((f) => ({ ...f, module: v }))}
                                isOpen={openFormDropdown === "module"}
                                onToggle={() => setOpenFormDropdown((d) => (d === "module" ? null : "module"))}
                                onClose={() => setOpenFormDropdown(null)}
                                triggerRef={formModuleTriggerRef}
                                dropdownRef={formModuleMenuRef}
                                searchable
                            />
                        </div>
                        <div>
                            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Task Name</label>
                            <div className="flex relative">
                                <input
                                    type="text"
                                    value={addTaskForm.taskName}
                                    onChange={(e) => setAddTaskForm((f) => ({ ...f, taskName: e.target.value }))}
                                    placeholder="Enter Task / Select Task"
                                    className={`flex-1 w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52] ${editingTaskId !== null ? "" : "rounded-r-none"}`}
                                />
                                {editingTaskId === null && (
                                    <TaskDropdown
                                        label="Tasklist"
                                        options={[
                                            "Select Task",
                                            ...Array.from(new Set(merged.map((t) => t.task_name).filter(Boolean))) as string[],
                                        ]}
                                        selected={null}
                                        onSelect={(val) => {
                                            if (!val || val === "Select Task") return;
                                            setAddTaskForm((f) => ({ ...f, taskName: val }));
                                        }}
                                        isOpen={tasklistOpen}
                                        onToggle={() => setTasklistOpen((d) => !d)}
                                        onClose={() => setTasklistOpen(false)}
                                        triggerRef={tasklistTriggerRef}
                                        dropdownRef={tasklistMenuRef}
                                        searchable
                                        searchPlaceholder="Search task..."
                                        maxVisibleItems={6}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-6">
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Type</label>
                                <FormDropdown
                                    label="Select Type"
                                    options={[
                                        { value: "", label: "Select Type" },
                                        { value: "task", label: "Task" },
                                        { value: "bug", label: "Bug" },
                                        { value: "feature", label: "Feature" },
                                    ]}
                                    value={addTaskForm.type}
                                    onChange={(v) => setAddTaskForm((f) => ({ ...f, type: v }))}
                                    isOpen={openFormDropdown === "type"}
                                    onToggle={() => setOpenFormDropdown((d) => (d === "type" ? null : "type"))}
                                    onClose={() => setOpenFormDropdown(null)}
                                    triggerRef={formTypeTriggerRef}
                                    dropdownRef={formTypeMenuRef}
                                    searchable
                                />
                            </div>
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Actual Start Date</label>
                                <input
                                    type="date"
                                    value={addTaskForm.actualStartDate}
                                    onChange={(e) => setAddTaskForm((f) => ({ ...f, actualStartDate: e.target.value }))}
                                    placeholder="dd/mm/yyyy"
                                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                                />
                            </div>
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Actual End Date</label>
                                <input
                                    type="date"
                                    value={addTaskForm.actualEndDate}
                                    onChange={(e) => setAddTaskForm((f) => ({ ...f, actualEndDate: e.target.value }))}
                                    placeholder="dd/mm/yyyy"
                                    className="w-full px-4 py-2 text-[14px] text-[#353535] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-6">
                            <div className="relative w-full">
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Select Start Time</label>
                                <button
                                    ref={formStartTimeTriggerRef}
                                    type="button"
                                    onClick={() =>
                                        setOpenFormDropdown((d) => (d === "type_start_time" ? null : "type_start_time"))
                                    }
                                    className="flex w-full items-center justify-between rounded-[5px] bg-[#F2F3F4] border border-transparent px-4 py-2 text-left text-[14px] font-Gantari focus:border-[#AEACAC52] outline-none shadow-none transition-all"
                                    aria-expanded={openFormDropdown === "type_start_time"}
                                    aria-haspopup="listbox"
                                    aria-label="Select Start Time"
                                >
                                    <span className={addTaskForm.startTime ? "text-[#353535]" : "text-[#8B8B8B]"}>
                                        {addTaskForm.startTime ? formatTimeForDisplay(addTaskForm.startTime) : "__:__"}
                                    </span>
                                    <img
                                        src={ArrowDown}
                                        alt=""
                                        className={`ml-2 h-4 w-4 shrink-0 transition-transform ${openFormDropdown === "type_start_time" ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {openFormDropdown === "type_start_time" && (
                                    <div
                                        ref={formStartTimeMenuRef}
                                        className="absolute top-full left-0 z-20 mt-2 w-full min-w-[200px] rounded-lg border border-[#AEACAC52] bg-white overflow-hidden shadow-none"
                                    >
                                        <TimePickerWheel
                                            value={addTaskForm.startTime}
                                            onChange={(v) => setAddTaskForm((f) => ({ ...f, startTime: v }))}
                                            onClose={() => setOpenFormDropdown(null)}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="relative w-full">
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Select End Time</label>
                                <button
                                    ref={formEndTimeTriggerRef}
                                    type="button"
                                    onClick={() =>
                                        setOpenFormDropdown((d) => (d === "type_end_time" ? null : "type_end_time"))
                                    }
                                    className="flex w-full items-center justify-between rounded-[5px] bg-[#F2F3F4] border border-transparent px-4 py-2 text-left text-[14px] font-Gantari focus:border-[#AEACAC52] outline-none shadow-none transition-all"
                                    aria-expanded={openFormDropdown === "type_end_time"}
                                    aria-haspopup="listbox"
                                    aria-label="Select End Time"
                                >
                                    <span className={addTaskForm.dueTime ? "text-[#353535]" : "text-[#8B8B8B]"}>
                                        {addTaskForm.dueTime ? formatTimeForDisplay(addTaskForm.dueTime) : "__:__"}
                                    </span>
                                    <img
                                        src={ArrowDown}
                                        alt=""
                                        className={`ml-2 h-4 w-4 shrink-0 transition-transform ${openFormDropdown === "type_end_time" ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {openFormDropdown === "type_end_time" && (
                                    <div
                                        ref={formEndTimeMenuRef}
                                        className="absolute top-full left-0 z-20 mt-2 w-full min-w-[200px] rounded-lg border border-[#AEACAC52] bg-white overflow-hidden shadow-none"
                                    >
                                        <TimePickerWheel
                                            value={addTaskForm.dueTime}
                                            onChange={(v) => setAddTaskForm((f) => ({ ...f, dueTime: v }))}
                                            onClose={() => setOpenFormDropdown(null)}
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Assign To</label>
                                <FormDropdown
                                    label="Select Assign To"
                                    options={[
                                        { value: "", label: "Select Assign To" },
                                        ...employees.map((e) => ({ value: e.full_name, label: e.full_name })),
                                    ]}
                                    value={addTaskForm.assignTo}
                                    onChange={(v) => setAddTaskForm((f) => ({ ...f, assignTo: v }))}
                                    isOpen={openFormDropdown === "assignTo"}
                                    onToggle={() => setOpenFormDropdown((d) => (d === "assignTo" ? null : "assignTo"))}
                                    onClose={() => setOpenFormDropdown(null)}
                                    triggerRef={formAssignTriggerRef}
                                    dropdownRef={formAssignMenuRef}
                                    searchable
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Description</label>
                            <textarea
                                value={addTaskForm.description}
                                onChange={(e) => setAddTaskForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Enter Description..."
                                rows={4}
                                className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none resize-none focus:border-[#AEACAC52]"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[16px] font-semibold text-[#000000] mb-2 font-Gantari">Checklist</label>
                            <input
                                type="text"
                                value={addTaskForm.checklist}
                                onChange={(e) => setAddTaskForm((f) => ({ ...f, checklist: e.target.value }))}
                                placeholder="Enter Reference Link"
                                className="w-full px-4 py-2 text-[14px] text-[#353535] placeholder-[#8B8B8B] bg-[#F2F3F4] border border-transparent rounded-[5px] font-Gantari transition-all outline-none focus:border-[#AEACAC52]"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="block text-[16px] font-semibold text-[#000000] font-Gantari">Attachments</label>
                            <input
                                ref={fileInputRef}
                                id="add-task-file-input"
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleAttachmentChange}
                                accept="*/*"
                            />
                            <div className="flex items-center bg-[#F4F4F4] rounded-[5px] overflow-hidden">
                                <div
                                    className="flex-1 px-4 text-[14px] text-[#979797] truncate min-w-0 py-2"
                                    title={attachmentFiles.length > 0 ? attachmentFiles.map((f) => f.name).join(", ") : undefined}
                                >
                                    {attachmentFiles.length > 0
                                        ? attachmentFiles.map((f) => f.name).join(", ")
                                        : "Choose file"}
                                </div>
                                <label
                                    htmlFor="add-task-file-input"
                                    className="px-5 py-2 bg-[#E0E0E0] text-[#353535] text-[14px] font-bold cursor-pointer transition-colors shrink-0 font-Gantari"
                                >
                                    Browse File
                                </label>
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
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8">
                        <button
                            type="button"
                            onClick={goBack}
                            className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#F2F2F2] text-[#616161] font-semibold text-[16px] transition-all font-Gantari min-w-[160px]"
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            className="w-full sm:w-auto px-12 py-2 rounded-lg bg-[#DBE9FE] text-[#101827] font-semibold text-[16px] transition-all font-Gantari min-w-[160px]"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            </div>
            <AttachmentPreviewModal
                file={attachmentPreviewFile}
                onClose={() => setAttachmentPreviewFile(null)}
            />
        </div>
    );
}
