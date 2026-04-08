import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../lib/api";
import Upload from "../../assets/ProjectManager/MyTask/Upload.svg";
import ImageIcon from "../../assets/ProjectManager/MyTask/image.svg";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";

interface Task {
  id: number;
  task_name?: string;
  status?: string;
  due_date?: string;
  project_name?: string;
  projectid?: number;
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
  modules_name?: string;
  category?: string;
  Actual_start_time?: string;
  perferstart_time?: string;
  perferend_time?: string;
  end_time?: string;
  outputfilepath?: string;
}

function formatDateDDMMYYYY(d?: string): string {
  if (!d) return "dd/mm/yyyy";
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimeAMPM(t?: string): string {
  if (!t) return "hh:mm AM/PM";
  const match = String(t).match(/(\d{1,2}):(\d{2})/);
  if (!match) return String(t);
  const h = parseInt(match[1], 10);
  const m = match[2];
  const am = h < 12;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${am ? "AM" : "PM"}`;
}

function normalizeStatus(s: string | undefined, approval?: string): StatusKey {
  if (approval?.toLowerCase() === "approved") return "approved";
  if (approval?.toLowerCase() === "rejected") return "rejected";
  if (!s) return "todo";
  const lower = s.toLowerCase().replace(/\s+/g, "_");
  if (lower.includes("progress") || lower === "in_progress")
    return "in_progress";
  if (lower.includes("complete") || lower === "done") return "completed";
  return "todo";
}

type StatusKey = "todo" | "in_progress" | "completed" | "approved" | "rejected";

const getTaskImageUrl = (filename: string) => {
  if (!filename) return "";
  const apiBaseUrl = import.meta.env.VITE_API_URL || "";
  return `${apiBaseUrl}/uploads/task/${filename}`;
};

const STATUS_STYLE: Record<
  StatusKey,
  { label: string; dot: string; bg: string }
> = {
  todo: {
    label: "To Do",
    dot: "bg-orange-500",
    bg: "bg-orange-100 text-orange-800 rounded-full",
  },
  in_progress: {
    label: "Inprogress",
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

const STATUS_OPTIONS: { value: "todo" | "in_progress" | "completed"; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "Inprogress" },
  { value: "completed", label: "Completed" },
];

function shouldHideInProgressInDropdown(status: StatusKey): boolean {
  return status === "approved" || status === "rejected";
}

function isStatusOptionDisabled(
  current: StatusKey,
  option: "todo" | "in_progress" | "completed",
): boolean {
  if (current === "todo" && option === "completed") return true;
  if (
    (current === "completed" || current === "approved") &&
    (option === "todo" || option === "in_progress")
  )
    return true;
  return false;
}

export default function MytaskViewBC() {
  const location = useLocation();
  const task = (location.state as { task?: Task } | null)?.task;
  const backToUrl = "/bc/mytasks";

  const [statusDisplay, setStatusDisplay] = useState<StatusKey>(() =>
    task ? normalizeStatus(task.status, task.Approval) : "todo",
  );
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<
    string | null
  >(null);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loading, setLoading] = useState(!task);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setSelectedImage(file);
    if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
    setSelectedImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleStatusUpdate = async (
    newStatus: "todo" | "in_progress" | "completed",
  ) => {
    if (!task || updatingStatus) return;
    if (isStatusOptionDisabled(statusDisplay, newStatus)) return;
    setUpdatingStatus(true);
    const backendStatus =
      newStatus === "completed"
        ? "Completed"
        : newStatus === "todo"
          ? "Todo"
          : "InProgress";

    try {
      await api.patch(`/api/tasks/${task.id}/status`, {
        status: backendStatus,
        projectId: task.projectid,
      });
      setStatusDisplay(newStatus);
      toast.success(`Status Updated Successfully`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
      setStatusDropdownOpen(false);
    }
  };

  const handleImageSubmit = async () => {
    if (!task || !selectedImage || submittingWork) return;
    setSubmittingWork(true);
    const formData = new FormData();
    formData.append("image", selectedImage);

    try {
      const res = await api.post(
        `/api/tasks/${task.id}/output-files`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      toast.success("Work submitted successfully");

      // Refetch or update local task state with new file paths
      const newFiles = res.data.files || [];
      if (task) {
        const existing = task.outputfilepath
          ? task.outputfilepath.split(",").filter(Boolean)
          : [];
        const updated = [...existing, ...newFiles].join(",");
        task.outputfilepath = updated;
      }

      setSelectedImage(null);
      if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
      setSelectedImagePreview(null);
    } catch (error) {
      console.error("Error submitting work:", error);
      toast.error("Failed to submit work");
    } finally {
      setSubmittingWork(false);
    }
  };

  useEffect(() => {
    return () => {
      if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
    };
  }, [selectedImagePreview]);

  useEffect(() => {
    if (!task) {
      const taskId = location.pathname.split("/").pop();
      if (taskId && !isNaN(Number(taskId))) {
        setLoading(true);
        api
          .get(`/api/tasks/${taskId}`)
          .then((res) => {
            if (res.data.task) {
              // The API usually returns the task directly or inside a wrapper
              // If res.data.task is available, used that, otherwise check res.data
              const fetched = res.data.task || res.data;
              // Update status display once data is in
              setStatusDisplay(
                normalizeStatus(fetched.status, fetched.Approval),
              );
            }
          })
          .catch((err) => {
            console.error("Error fetching task:", err);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [task, location.pathname]);

  useEffect(() => {
    if (!task) return;
    const next = normalizeStatus(task.status, task.Approval);
    setStatusDisplay(next);
  }, [task]);

  useEffect(() => {
    if (!statusDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusDropdownOpen]);

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="bg-white min-h-screen p-6">
        <p className="text-slate-600 mb-4">
          No task selected or task not found.
        </p>
        <Link
          to="/bc/mytasks"
          className="text-[#3d3399] hover:underline font-medium cursor-pointer"
        >
          ← Back to Tasks
        </Link>
      </div>
    );
  }

  const style = STATUS_STYLE[statusDisplay];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 shrink-0">
        <Link
          to={backToUrl}
          className="group relative p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
        >
          <img src={backIcon} alt="Back" className="w-5 h-5" />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
            <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
            <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
              <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                Go Back
              </span>
            </div>
          </div>
        </Link>
        <h1 className="flex-1 text-center text-[24px] font-semibold text-black">
          {task.task_name || "Task Name"}
        </h1>
        <div className="w-9" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-7xl mx-auto">
        {/* Status row */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-md text-black">Status:</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`}
              />
              {style.label}
            </span>
          </div>
          <div className="relative" ref={statusDropdownRef}>
            <button
              type="button"
              disabled={updatingStatus}
              onClick={() => setStatusDropdownOpen((prev) => !prev)}
              className={`rounded-[5px] bg-[#E8E8E8] px-3 py-2 text-[14px] text-[#8B8B8B] flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer border-0 ${updatingStatus ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              aria-expanded={statusDropdownOpen}
              aria-haspopup="listbox"
            >
              {updatingStatus ? "Updating..." : "Select Status"}
              <FiChevronDown className="w-5 h-5 text-[#8B8B8B]" />
            </button>
            {statusDropdownOpen && !updatingStatus && (
              <div
                className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg bg-white py-1 shadow-lg border border-slate-200"
                role="listbox"
              >
                {STATUS_OPTIONS.filter(
                  (opt) =>
                    !(
                      shouldHideInProgressInDropdown(statusDisplay) &&
                      opt.value === "in_progress"
                    ),
                ).map((opt) => {
                  const disabled = isStatusOptionDisabled(
                    statusDisplay,
                    opt.value,
                  );
                  return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-disabled={disabled}
                    disabled={disabled}
                    aria-selected={statusDisplay === opt.value}
                    onClick={() => handleStatusUpdate(opt.value)}
                    className={`w-full text-left px-3 py-2 text-[14px] flex items-center gap-2 transition-colors ${
                      disabled
                        ? "text-slate-300 cursor-not-allowed opacity-60"
                        : "cursor-pointer text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535]"
                    } ${
                      statusDisplay === opt.value && !disabled
                        ? "bg-[#F2F2F2] text-[#353535] font-medium"
                        : ""
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_STYLE[opt.value].dot}`}
                    />
                    {opt.label}
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Two columns: Task details (left) + Submit Work (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border border-slate-200 rounded-xl p-6">
          <div className="space-y-4 text-[14px]">
            <div className="flex gap-2">
              <span className="text-[#020202] font-medium shrink-0 w-32">Project Name</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">{task.project_name || "—"}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] font-medium shrink-0 lg:whitespace-nowrap w-32">
                Modules Name
              </span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {String(task.modules_name || task.module || "—")}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-[#020202] font-medium shrink-0 w-32">Category</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {String(task.category || task.type || "—")}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] font-medium shrink-0 w-32">Assigned By</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {task.uploader_full_name ?? "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] font-medium shrink-0 w-32">Assigned To</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {task.assigned_full_name ?? task.assign_to ?? "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] font-medium shrink-0 w-32">Start Date</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {task.start_date || task.Actual_start_time
                  ? formatDateDDMMYYYY(
                      task.start_date || task.Actual_start_time,
                    )
                  : "-NIL-"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] font-medium shrink-0 w-32">Due Date</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {task.due_date ? formatDateDDMMYYYY(task.due_date) : "-NIL-"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] font-medium shrink-0 lg:whitespace-nowrap w-32">Start Time</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {task.perferstart_time || task.start_time
                  ? formatTimeAMPM(task.perferstart_time || task.start_time)
                  : "-NIL-"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] font-medium shrink-0 lg:whitespace-nowrap w-32">End Time</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161]">
                {task.perferend_time || task.due_time || task.end_time
                  ? formatTimeAMPM(
                      task.perferend_time || task.due_time || task.end_time,
                    )
                  : "-NIL-"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#020202] font-medium shrink-0 lg:whitespace-nowrap w-32">Attachments</span>
              <span className="text-[#020202] shrink-0">:</span>
              <span className="text-[#616161] break-all">
                {task.outputfilepath
                  ? task.outputfilepath
                      .split(",")
                      .map((f) => f.trim())
                      .filter(Boolean)
                      .map((f) => {
                        const base = f.split("/").pop() || f;
                        const idx = base.indexOf("_");
                        return idx > 8 ? base.slice(idx + 1) : base;
                      })
                      .join(", ")
                  : "-NIL-"}
              </span>
            </div>
          </div>

          <div className="rounded-sm bg-[#F2F7FF] p-4 h-fit">
            <h4 className="text-[#020202] text-[18px]  mb-1">Submit Work</h4>
            <p className="text-[14px] text-[#8B8B8B] mb-4">
              Choose your finished work or error screenshots to update the team
              on your progress.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Select image"
              onChange={handleSelectImage}
            />
            <div className="rounded-sm bg-[#FFFFFF] flex flex-col items-center justify-center py-8 px-4 text-slate-500 min-h-[120px] relative transition-all duration-200">
              {selectedImagePreview ? (
                <>
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setSelectedImagePreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-white/80 rounded-full shadow-sm hover:bg-white transition-colors z-10 cursor-pointer group"
                  >
                    <FiX className="w-4 h-4 text-slate-600" />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                      <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                      <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35),0_6px_16px_rgba(0,0,0,0)] px-4 py-0.5 relative z-10">
                        <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                          Close
                        </span>
                      </div>
                    </div>
                  </button>
                  <img
                    src={selectedImagePreview}
                    alt="Selected"
                    className="max-h-48 max-w-full object-contain rounded"
                  />
                </>
              ) : (
                <>
                  <img src={ImageIcon} alt="Image" className="w-7 h-7" />
                  <span className="text-xs mt-2">No Image Selected</span>
                </>
              )}
            </div>
            <div className="flex gap-4 mt-6 justify-center">
              <button
                type="button"
                disabled={submittingWork}
                onClick={() => fileInputRef.current?.click()}
                className={`inline-flex items-center gap-1 rounded-sm bg-[#DBE9FE] px-4 py-2 text-[14px] text-black hover:bg-[#D5E6FF] whitespace-nowrap transition-all ${submittingWork ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                <img src={Upload} alt="Upload" className="w-3 h-3 mr-1" />
                <span className="mr-2">Select Image</span>
              </button>
              <button
                type="button"
                disabled={!selectedImage || submittingWork}
                onClick={handleImageSubmit}
                className={`inline-flex items-center gap-1 rounded-md bg-[#E1F6EB] px-4 py-2 text-[14px] text-[#008F22] hover:bg-[#D6F5E8] whitespace-nowrap transition-all ${!selectedImage || submittingWork ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                <FiCheck className="w-4 h-4 text-[#008F22]" />
                {submittingWork ? "Submitting..." : "Submit Image"}
              </button>
            </div>
          </div>
        </div>

        {/* Uploaded Work Display */}
        {task.outputfilepath &&
          task.outputfilepath.split(",").filter(Boolean).length > 0 && (
            <div className="mt-6 border border-slate-200 rounded-xl p-6">
              <h4 className="text-black text-md mb-4 font-semibold">
                Uploaded Work
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {task.outputfilepath
                  .split(",")
                  .filter(Boolean)
                  .map((filename, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                    >
                      <a
                        href={getTaskImageUrl(filename)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full h-full"
                      >
                        <img
                          src={getTaskImageUrl(filename)}
                          alt={`Uploaded work ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = ImageIcon;
                            (e.target as HTMLImageElement).className =
                              "w-10 h-10 m-auto mt-4 opacity-20";
                          }}
                        />
                      </a>
                    </div>
                  ))}
              </div>
            </div>
          )}

        {/* Task Description */}
        <div className="mt-6 pt-4 border border-slate-200 rounded-xl p-6">
          <h4 className=" text-black text-md mb-2">Task Description</h4>
          <div className="rounded-lg bg-[#F2F3F4] px-3 py-2 text-sm text-slate-800 min-h-[44px]">
            {task.description || "Event (Consultant Partnership)..."}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
