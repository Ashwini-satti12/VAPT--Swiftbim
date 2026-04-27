import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import Upload from "../../assets/ProjectManager/MyTask/Upload.svg";
import ImageIcon from "../../assets/ProjectManager/MyTask/image.svg";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import downloadIcon from "../../assets/TechnicalDirector/download icon.svg";

interface Task {
  id: number;
  task_name?: string;
  status?: string;
  due_date?: string;
  project_name?: string;
  projectid?: number;
  start_date?: string;
  progress?: number;
  type?: string;
  start_time?: string;
  due_time?: string;
  assign_to?: string;
  assigned_to?: number | string;
  uploaderid?: number | string;
  module?: string;
  description?: string;
  checklist?: string;
  assigned_full_name?: string;
  uploader_full_name?: string;
  Approval?: string;
  modules_name?: string;
  Actual_start_time?: string;
  perferstart_time?: string;
  perferend_time?: string;
  end_time?: string;
  outputfilepath?: string;
  review_remark?: string;
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

const STATUS_OPTIONS: {
  value: "todo" | "in_progress" | "completed";
  label: string;
}[] = [
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

export default function MytaskViewBL() {
  const { user } = useAuth();
  const location = useLocation();
  const { id: taskIdParam } = useParams();
  const routeState =
    (location.state as { task?: Task; from?: string } | null) ?? null;
  const [task, setTask] = useState<Task | undefined>(routeState?.task);
  const fromTeamTask =
    routeState?.from === "teamtask" || routeState?.from === "teamtasks";
  const backToTasksPath =
    fromTeamTask
      ? "/bl/teamtasks"
      : "/bl/mytasks";

  const [statusDisplay, setStatusDisplay] = useState<StatusKey>(() =>
    task ? normalizeStatus(task.status, task.Approval) : "todo",
  );
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(!task);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [reviewRemarkInput, setReviewRemarkInput] = useState("");
  const [sendingBack, setSendingBack] = useState(false);
  const [approving, setApproving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch task if missing (on refresh)
  useEffect(() => {
    if (task) {
      setLoading(false);
      return;
    }

    const taskId = taskIdParam;
    if (taskId) {
      setLoading(true);
      const searchParams = new URLSearchParams(location.search);
      const isOutsource = searchParams.get("source") === "Outsource";
      const endpoint = isOutsource
        ? `/api/vendors/vendor-tasks/${taskId}`
        : `/api/tasks/${taskId}`;

      api
        .get(endpoint)
        .then((res) => {
          const t = res.data.tasks?.[0] || res.data;
          if (isOutsource) t.source = "Outsource";
          setTask(t);
          setStatusDisplay(normalizeStatus(t.status, t.Approval));
        })
        .catch((err) => {
          console.error("Error fetching task:", err);
          toast.error("Failed to load task details");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [task, taskIdParam, location.search]);

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
      setTask((prev) =>
        prev
          ? {
            ...prev,
            status:
              newStatus === "completed"
                ? "Completed"
                : newStatus === "todo"
                  ? "To Do"
                  : "InProgress",
          }
          : prev,
      );
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

      // Update task state with new file paths
      const newFiles = res.data.files || [];
      setTask((prev) => {
        if (!prev) return prev;
        const existing = prev.outputfilepath
          ? prev.outputfilepath.split(",").filter(Boolean)
          : [];
        const updated = [...existing, ...newFiles].join(",");
        return { ...prev, outputfilepath: updated };
      });

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
    if (!task) return;
    const next = normalizeStatus(task.status, task.Approval);
    setStatusDisplay(next);
    setReviewRemarkInput(task.review_remark || "");
  }, [task]);

  const isAssigner = task?.uploaderid != null && String(task.uploaderid) === String(user?.id);
  const canReview =
    (statusDisplay === "completed" || (task as any).review_required) &&
    task?.assigned_to != null &&
    task?.uploaderid != null &&
    isAssigner &&
    String(task.assigned_to) !== String(task.uploaderid) &&
    task.Approval?.toLowerCase() !== "approved";

  const handleApprove = async () => {
    if (!task || approving) return;
    setApproving(true);
    try {
      const isOutsource = (task as any).source === "Outsource";
      const endpoint = isOutsource
        ? `/api/vendors/vendor-tasks/${task.id}/status`
        : `/api/tasks/${task.id}/status`;

      await api.patch(endpoint, {
        status: "Approved",
        projectId: task.projectid,
      });
      setTask((prev) => (prev ? { ...prev, Approval: "Approved" } : prev));
      setStatusDisplay("approved");
      toast.success("Task Approved");
    } catch (err) {
      console.error("Error approving task:", err);
      toast.error("Failed to approve task");
    } finally {
      setApproving(false);
    }
  };

  const handleSendBackForCorrection = async () => {
    if (!task || sendingBack) return;
    const remark = (reviewRemarkInput || "").trim();
    if (!remark) {
      toast.error("Please enter review remark before sending back.");
      return;
    }
    setSendingBack(true);
    try {
      await api.patch(`/api/tasks/${task.id}`, {
        review_remark: remark,
      });
      await api.patch(`/api/tasks/${task.id}/status`, {
        status: "Todo",
        projectId: task.projectid,
      });
      setTask((prev) =>
        prev ? { ...prev, review_remark: remark, status: "To Do" } : prev,
      );
      setStatusDisplay("todo");
      toast.success("Returned to assignee in To Do.");
    } catch (error) {
      console.error("Error sending task back:", error);
      toast.error("Failed to send back task");
    } finally {
      setSendingBack(false);
    }
  };

  const handleSaveRemark = async () => {
    if (!task || sendingBack) return;
    const remark = (reviewRemarkInput || "").trim();
    setSendingBack(true); // Reuse loading state
    try {
      await api.patch(`/api/tasks/${task.id}`, {
        review_remark: remark,
      });
      toast.success("Remark saved successfully");
    } catch (error) {
      console.error("Error saving remark:", error);
      toast.error("Failed to save remark");
    } finally {
      setSendingBack(false);
    }
  };

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3d3399]"></div>
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
          to={backToTasksPath}
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
      <div className="flex items-center justify-between px-5 pt-4 shrink-0 mb-4">
        <div className="group relative inline-flex shrink-0">
          <Link
            to={backToTasksPath}
            className="p-2 rounded-[5px] bg-[#F2F2F2] transition-colors"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </Link>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
            <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
            <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-2 py-0.5 relative z-10">
              <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                Go Back
              </span>
            </div>
          </div>
        </div>
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
                className="rounded-[5px] bg-[#E8E8E8] px-3 py-2 text-[14px] text-[#8B8B8B] flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer border-0"
                aria-expanded={statusDropdownOpen}
                aria-haspopup="listbox"
              >
                {updatingStatus ? "Updating..." : "Select Status"}
                <FiChevronDown className="w-5 h-5 text-[#8B8B8B]" />
              </button>
              {statusDropdownOpen && !updatingStatus && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg bg-white py-1 shadow-lg border border-slate-200 cursor-pointer"
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
                        className={`w-full text-left px-3 py-2 text-[14px] flex items-center gap-2 transition-colors ${disabled
                          ? "text-slate-300 cursor-not-allowed opacity-60"
                          : "cursor-pointer text-[#8B8B8B] hover:bg-[#F2F2F2] hover:text-[#353535]"
                          } ${statusDisplay === opt.value && !disabled
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

          {/* Task Details Card */}
          <div className="w-full border border-slate-200 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-[14px]">
              {/* Row 1: Project Name | Modules Name */}
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Project Name
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161] break-words">
                  {task.project_name || "—"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Modules Name
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161] break-words">
                  {String(task.modules_name || task.module || "—")}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Assigned By
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161]">
                  {task.uploader_full_name ?? "—"}
                </span>
              </div>

              {/* Row 3: Assigned To | Start Date */}
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Assigned To
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161]">
                  {task.assigned_full_name ?? task.assign_to ?? "—"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Start Date
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161]">
                  {task.start_date || task.Actual_start_time
                    ? formatDateDDMMYYYY(
                      task.start_date || task.Actual_start_time,
                    )
                    : "-NIL-"}
                </span>
              </div>

              {/* Row 4: End Date | Start Time */}
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  End Date
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161]">
                  {task.due_date ? formatDateDDMMYYYY(task.due_date) : "-NIL-"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32 lg:whitespace-nowrap">
                  Start Time
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161]">
                  {task.perferstart_time || task.start_time
                    ? formatTimeAMPM(task.perferstart_time || task.start_time)
                    : "-NIL-"}
                </span>
              </div>

              {/* Row 5: End Time | Attachments */}
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  End Time
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <span className="text-[#616161]">
                  {task.perferend_time || task.due_time || task.end_time
                    ? formatTimeAMPM(
                      task.perferend_time || task.due_time || task.end_time,
                    )
                    : "-NIL-"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#020202] font-medium shrink-0 w-32">
                  Attachments
                </span>
                <span className="text-[#020202] shrink-0">:</span>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  {task.outputfilepath ? (
                    task.outputfilepath
                      .split(",")
                      .map((f) => f.trim())
                      .filter(Boolean)
                      .map((f, idx) => {
                        const url = getTaskImageUrl(f);
                        const base = f.split("/").pop() || f;
                        const underscoreIdx = base.indexOf("_");
                        const displayName =
                          underscoreIdx > 8 ? base.slice(underscoreIdx + 1) : base;

                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-[14px] font-medium text-[#616161] truncate font-Gantari">
                              {displayName}
                            </span>
                            <div className="flex items-center gap-2">
                              {/* View Tooltip */}
                              <div className="relative group/tooltip inline-flex shrink-0">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                                >
                                  <img
                                    src={viewIcon}
                                    alt="View"
                                    className="w-4 h-4 cursor-pointer"
                                  />
                                </a>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-3 py-0.5 relative z-10">
                                    <span className="font-Gantari text-[12px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                      View
                                    </span>
                                  </div>
                                  <div className="w-2 h-2 bg-[#FFFFFF] border-r border-b border-[#C1C1C1] rotate-45 relative z-20 -mt-[4.5px]"></div>
                                </div>
                              </div>

                              {/* Download Tooltip */}
                              <div className="relative group/tooltip inline-flex shrink-0">
                                <a
                                  href={url}
                                  download
                                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                                >
                                  <img
                                    src={downloadIcon}
                                    alt="Download"
                                    className="w-4 h-4 cursor-pointer"
                                  />
                                </a>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                                  <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-3 py-0.5 relative z-10">
                                    <span className="font-Gantari text-[12px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                                      Download
                                    </span>
                                  </div>
                                  <div className="w-2 h-2 bg-[#FFFFFF] border-r border-b border-[#C1C1C1] rotate-45 relative z-20 -mt-[4.5px]"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <span className="text-[#616161]">-NIL-</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="gap-6 mt-6">
            {/* Submit Work (Kept from BL) */}
            {/* <div className="border border-slate-200 rounded-xl p-6 bg-[#F2F7FF]">
              <h4 className="text-[#020202] text-[18px] mb-1 font-semibold">
                Submit Work
              </h4>
              <p className="text-[14px] text-[#8B8B8B] mb-4 font-medium">
                Choose your finished work or error screenshots to update the
                team on your progress.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Select image"
                onChange={handleSelectImage}
              />
              <div className="rounded-md bg-[#F2F2F2] flex flex-col items-center justify-center py-2 px-5 text-slate-500 min-h-[120px] relative transition-all duration-200">
                {selectedImagePreview ? (
                  <>
                    <div className="absolute top-2 right-2 relative group z-10">
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setSelectedImagePreview(null);
                        }}
                        className="p-1 bg-white/80 rounded-full transition-colors cursor-pointer shadow-sm hover:bg-white"
                      >
                        <FiX className="w-4 h-4 text-slate-600" />
                      </button>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
                        <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
                        <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md px-3 py-0.5 relative z-10">
                          <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                            Close
                          </span>
                        </div>
                      </div>
                    </div>
                    <img
                      src={selectedImagePreview}
                      alt="Selected"
                      className="max-h-48 max-w-full object-contain rounded"
                    />
                  </>
                ) : (
                  <>
                    <img src={ImageIcon} alt="Image" className="w-7 h-7" />
                    <span className="text-xs mt-2 font-medium">
                      No Image Selected
                    </span>
                  </>
                )}
              </div>
              <div className="flex gap-4 mt-6 justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-sm bg-[#DBE9FE] px-4 py-2 text-[14px] font-medium text-black hover:bg-[#D5E6FF] whitespace-nowrap disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <img src={Upload} alt="Upload" className="w-3 h-3 mr-1" />
                  <span className="mr-2">Select Image</span>
                </button>
                <button
                  onClick={handleImageSubmit}
                  disabled={submittingWork || !selectedImage}
                  className="inline-flex items-center gap-1 rounded-md bg-[#E1F6EB] px-4 py-2 text-[14px] font-semibold text-[#008F22] hover:bg-[#D6F5E8] whitespace-nowrap disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {submittingWork ? "Submitting..." : "Submit Work"}
                </button>
              </div>
            </div> */}

            {/* Task Description (Full Width row if needed) */}
            <div className="border border-slate-200 rounded-xl p-6 flex flex-col h-full bg-white">
              <h4 className="text-[#020202] text-[18px] mb-2 font-semibold">
                Task Description
              </h4>
              <div className="flex-1 rounded-lg bg-[#F2F3F4] px-3 py-2 text-sm text-slate-800 min-h-[100px]">
                {task.description || "No description provided."}
              </div>
            </div>
            <div className="mt-6 border border-slate-200 rounded-xl p-6 flex flex-col h-full bg-white">
              <h4 className="text-[#020202] text-[18px] mb-2 font-semibold">
                Checklist
              </h4>
              <div className="flex-1 rounded-lg bg-[#F2F3F4] px-3 py-2 text-sm text-slate-800 min-h-[44px]">
                {task.checklist || "No checklist provided."}
              </div>
            </div>

            {!fromTeamTask &&
              task.uploaderid != null &&
              task.assigned_to != null &&
              String(task.uploaderid) !== String(task.assigned_to) && (
                <div className="mt-6 border border-slate-200 rounded-xl p-6 flex flex-col h-full bg-white">
                  <h4 className="text-[#020202] text-[18px] mb-2 font-semibold">
                    Review Remark
                  </h4>
                  <div className="flex-1 rounded-lg bg-[#F2F3F4] px-3 py-2 text-sm text-slate-800 min-h-[44px]">
                    {task.review_remark || "No review remark provided."}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
