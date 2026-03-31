import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import viewIcon from "../../assets/BIMModeler/ManageLeave/view icon.svg";

interface LeaveEntry {
  id: number;
  slNo: number;
  employeeName: string;
  role?: string;
  employeeId?: number;
  email?: string;
  leaveType: string;
  leaveTypeId?: number | null;
  appliedOn: string;
  appliedTo?: string;
  currentStatus: string;
  fromDate?: string;
  toDate?: string;
  description?: string;
}

function normalizeNameAndReason(value: string): string {
  const allowed = value.replace(/[^\w\s.,\-'()\/&@!#?;:'"]/g, "");
  return allowed.replace(/\s+/g, " ");
}

function toInputDate(d: string | undefined): string {
  if (!d) return "";
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const slashParts = s.split("/");
  if (slashParts.length === 3) {
    const [dd, mm, yy] = slashParts;
    if (dd && mm && yy) return `${yy}-${mm}-${dd}`;
  }
  const dashParts = s.split("-");
  if (dashParts.length === 3) {
    const [dd, mm, yy] = dashParts;
    if (dd && mm && yy) return `${yy}-${mm}-${dd}`;
  }
  return "";
}

function formatApiDate(value: string | undefined | null): string {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yy, mm, dd] = s.split("-");
    return `${dd}/${mm}/${yy}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return s;
  }
}

function getTodayInputDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const LEAVE_TYPES = [
  "Sick Leave",
  "Casual Leave",
  "Earned Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Unpaid Leave",
];

const showEntriesOptions = [
  { value: "0-100", label: "0-100", start: 0, end: 100 },
  { value: "101-200", label: "101-200", start: 100, end: 200 },
  { value: "201-300", label: "201-300", start: 200, end: 300 },
  { value: "301-400", label: "301-400", start: 300, end: 400 },
  { value: "all", label: "All", start: 0, end: null },
];

export default function ManageLeaveBC() {
  const { user } = useAuth();
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveEntry | null>(null);
  const [leaves, setLeaves] = useState<LeaveEntry[]>([]);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveEntry | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [reason, setReason] = useState("");
  const [applyFormErrors, setApplyFormErrors] = useState<Record<string, string>>({});
  const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
  const [leaveTypeOpenEdit, setLeaveTypeOpenEdit] = useState(false);
  const leaveTypeDropdownRef = useRef<HTMLDivElement>(null);
  const leaveTypeDropdownEditRef = useRef<HTMLDivElement>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<string>("All");
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedShowEntries, setSelectedShowEntries] = useState(showEntriesOptions[0].value);
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);

  const employeeOptions = ["All", ...Array.from(new Set(leaves.map((l) => l.employeeName)))];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setEmployeeDropdownOpen(false);
      }
      if (showEntriesDropdownRef.current && !showEntriesDropdownRef.current.contains(event.target as Node)) {
        setShowEntriesOpen(false);
      }
      if (leaveTypeDropdownRef.current && !leaveTypeDropdownRef.current.contains(event.target as Node)) {
        setLeaveTypeOpen(false);
      }
       if (leaveTypeDropdownEditRef.current && !leaveTypeDropdownEditRef.current.contains(event.target as Node)) {
        setLeaveTypeOpenEdit(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchExistingLeaves = async () => {
      if (!user?.id) return;
      try {
        const { data } = await api.get<{ applications?: any[] }>("/api/leave/applications");
        const apps = (data.applications || []).filter((app) => app.employee_id === user.id);
        const mapped: LeaveEntry[] = apps.map((app, index) => ({
          id: app.lid,
          slNo: index + 1,
          employeeId: app.employee_id,
          employeeName: app.full_name || user.full_name || "Unknown",
          role: app.role || user.user_role || "BIM Coordinator",
          email: app.email || user.email || undefined,
          leaveType: app.type_name || app.title || "Others",
          appliedOn: formatApiDate(app.posting_date),
          fromDate: formatApiDate(app.from_date),
          toDate: formatApiDate(app.to_date),
          description: app.description || "",
          currentStatus: app.status === 1 ? "Approved" : app.status === 2 ? "Rejected" : "Pending",
        }));
        setLeaves(mapped);
      } catch (err) {
        console.error("Failed to load BIM Coordinator leaves", err);
      }
    };
    fetchExistingLeaves();
  }, [user?.id]);

  const validateApplyForm = (): boolean => {
    const err: Record<string, string> = {};
    const today = getTodayInputDate();
    if (!leaveType) err.leaveType = "Leave type is required";
    if (!leaveFrom) err.leaveFrom = "Leave from date is required";
    if (!leaveTo) err.leaveTo = "Leave to date is required";
    if (leaveFrom && leaveFrom < today) err.leaveFrom = "Leave from date cannot be in the past";
    if (leaveTo && leaveTo < today) err.leaveTo = "Leave to date cannot be in the past";
    if (!reason.trim()) err.reason = "Reason is required";
    if (leaveFrom && leaveTo && leaveFrom > leaveTo) err.leaveTo = "Leave to must be on or after leave from";
    setApplyFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmitApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateApplyForm()) return;
    try {
      await api.post("/api/leave/applications", {
        leavetype: leaveType,
        description: reason.trim(),
        from_date: leaveFrom,
        to_date: leaveTo,
      });
      // Refresh leaves list
      const { data } = await api.get<{ applications?: any[] }>("/api/leave/applications");
      const apps = (data.applications || []).filter((app) => app.employee_id === user?.id);
      const mapped: LeaveEntry[] = apps.map((app, index) => ({
        id: app.lid,
        slNo: index + 1,
        employeeId: app.employee_id,
        employeeName: app.full_name || user?.full_name || "Unknown",
        role: app.role || user?.user_role || "BIM Coordinator",
        email: app.email || user?.email || undefined,
        leaveType: app.type_name || app.title || "Others",
        appliedOn: formatApiDate(app.posting_date),
        fromDate: formatApiDate(app.from_date),
        toDate: formatApiDate(app.to_date),
        description: app.description || "",
        currentStatus: app.status === 1 ? "Approved" : app.status === 2 ? "Rejected" : "Pending",
      }));
      setLeaves(mapped);
      handleCloseModal();
    } catch (err) {
      console.error("Failed to submit leave", err);
    }
  };

  const handleCloseModal = () => {
    setApplyModalOpen(false);
    setLeaveType("");
    setLeaveFrom("");
    setLeaveTo("");
    setReason("");
    setApplyFormErrors({});
  };

  const handleEdit = (row: LeaveEntry) => {
    setEditingLeave(row);
    setLeaveType(row.leaveType);
    setLeaveFrom(toInputDate(row.fromDate));
    setLeaveTo(toInputDate(row.toDate));
    setReason(row.description ?? "");
    setApplyFormErrors({});
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingLeave(null);
    setLeaveType("");
    setLeaveFrom("");
    setLeaveTo("");
    setReason("");
    setApplyFormErrors({});
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave || !validateApplyForm()) return;
    try {
      await api.patch(`/api/leave/applications/${editingLeave.id}`, {
        leavetype: leaveType,
        description: reason.trim(),
        from_date: leaveFrom,
        to_date: leaveTo,
      });
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === editingLeave.id
            ? {
                ...l,
                leaveType,
                fromDate: formatApiDate(leaveFrom),
                toDate: formatApiDate(leaveTo),
                description: reason.trim(),
              }
            : l
        )
      );
      handleCloseEditModal();
    } catch (err) {
      console.error("Failed to update leave", err);
    }
  };

  const handleDelete = async (row: LeaveEntry) => {
    if (!window.confirm(`Delete leave for ${row.employeeName}?`)) return;
    try {
      await api.delete(`/api/leave/applications/${row.id}`);
      setLeaves((prev) => prev.filter((l) => l.id !== row.id));
    } catch (err) {
      console.error("Failed to delete leave", err);
    }
  };

  const filteredList = selectedEmployee === "All" ? leaves : leaves.filter((l) => l.employeeName === selectedEmployee);
  const selectedRange = showEntriesOptions.find((o) => o.value === selectedShowEntries) ?? showEntriesOptions[0];
  const rangeStart = selectedRange.start;
  const rangeEnd = selectedRange.end === null ? filteredList.length : Math.min(selectedRange.end, filteredList.length);
  const displayedList = filteredList.slice(rangeStart, rangeEnd);

  const handleView = (row: LeaveEntry) => {
    setSelectedLeave(row);
    setViewModalOpen(true);
  };

  return (
    <div className="pt-2 px-0 pb-6 flex flex-col h-full font-gantari overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex flex-col flex-1 min-h-0" style={{ transform: "scale(0.8)", transformOrigin: "top left", width: "125%" }}>
          <div className="flex-shrink-0 mb-6 flex flex-row items-center justify-between gap-4 flex-wrap">
            <h1 className="text-[28px] font-semibold text-[#353535] tracking-tight">Manage Leave</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setApplyModalOpen(true)}
                className="px-4 py-2 bg-[#DD4346] text-white rounded-md text-[18px] font-medium transition-colors cursor-pointer"
              >
                Apply Leave
              </button>
              <div className="relative" ref={employeeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setEmployeeDropdownOpen((o) => !o)}
                  className={`flex items-center gap-2 px-4 py-2.5 bg-[#E8E8E8] rounded-md border border-[#E5E5E5] transition-all cursor-pointer font-medium text-sm min-w-[140px] justify-between ${employeeDropdownOpen ? "text-[#353535]" : "text-[#616161]"}`}
                >
                  <span className="text-[18px]">Employee:</span>
                  <span className="truncate max-w-[100px]">{selectedEmployee}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform duration-200 ${employeeDropdownOpen ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {employeeDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-md border border-[#E5E5E5] min-w-[160px] max-h-[240px] overflow-y-auto py-1.5 custom-scrollbar">
                    {employeeOptions.map((name) => (
                      <button
                        key={name}
                        onClick={() => { setSelectedEmployee(name); setEmployeeDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[16px] font-medium transition-colors truncate ${selectedEmployee === name ? "text-[#353535] bg-[#F0F2F7]" : "text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]"}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative" ref={showEntriesDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowEntriesOpen((o) => !o)}
                  className={`flex items-center gap-2 px-4 py-2.5 bg-[#E8E8E8] rounded-md border border-[#E5E5E5] transition-all cursor-pointer font-medium text-sm ${showEntriesOpen ? "text-[#353535]" : "text-[#616161]"}`}
                >
                  <span className="text-[17px]">Show:</span>
                  <span className="text-[17px]">{selectedRange.label}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showEntriesOpen ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {showEntriesOpen && (
                  <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-md border border-[#E5E5E5] shadow-lg min-w-[140px] py-1.5">
                    {showEntriesOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setSelectedShowEntries(opt.value); setShowEntriesOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[17px] font-medium transition-colors ${selectedShowEntries === opt.value ? "text-[#353535] bg-[#F0F2F7]" : "text-[#616161] hover:text-[#353535] hover:bg-[#F8F9FA]"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[10px] border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col relative">
            <div className="overflow-auto custom-scrollbar smooth-scroll">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-white border-b border-[rgb(89,89,89)]/20">
                  <tr>
                    <th className="px-3 py-4 text-center text-[18px] font-semibold text-[#353535]">Sl.No</th>
                    <th className="px-3 py-4 text-center text-[18px] font-semibold text-[#353535]">Employee Name</th>
                    <th className="px-3 py-4 text-center text-[18px] font-semibold text-[#353535]">Role</th>
                    <th className="px-3 py-4 text-center text-[18px] font-semibold text-[#353535]">Leave Type</th>
                    <th className="px-3 py-4 text-center text-[18px] font-semibold text-[#353535]">From Date</th>
                    <th className="px-3 py-4 text-center text-[18px] font-semibold text-[#353535]">To Date</th>
                    <th className="px-3 py-4 text-center text-[18px] font-semibold text-[#353535]">Status</th>
                    <th className="px-3 py-4 text-center text-[18px] font-semibold text-[#353535]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayedList.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-12 text-center text-gray-400 font-medium bg-white">No leave records found</td></tr>
                  ) : (
                    displayedList.map((row, index) => (
                      <tr key={row.id} className={`${index % 2 === 1 ? "bg-[#F2F2F2]" : "bg-white"} hover:bg-gray-100 transition-colors`}>
                        <td className="px-3 py-6 text-center text-[17px] text-[#353535] font-medium">{String(rangeStart + index + 1).padStart(2, "0")}</td>
                        <td className="px-3 py-6 text-center text-[17px] text-[#353535] font-semibold">{row.employeeName}</td>
                        <td className="px-3 py-6 text-center text-[17px] text-[#353535]">{row.role ?? "–"}</td>
                        <td className="px-3 py-6 text-center text-[17px] text-[#353535]">{row.leaveType}</td>
                        <td className="px-3 py-6 text-center text-[17px] text-[#353535]">{row.fromDate ?? "–"}</td>
                        <td className="px-3 py-6 text-center text-[17px] text-[#353535]">{row.toDate ?? "–"}</td>
                        <td className="px-3 py-6 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[13px] font-semibold ${row.currentStatus === "Approved" ? "bg-[#DCFCE7] text-[#15803D]" : row.currentStatus === "Rejected" ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#FEF9C3] text-[#854D0E]"}`}>{row.currentStatus}</span>
                        </td>
                        <td className="px-3 py-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleView(row)} className="p-2 rounded-lg hover:bg-gray-200 transition-colors" title="View"><img src={viewIcon} alt="View" className="w-5 h-5 opacity-70" /></button>
                            <button onClick={() => handleEdit(row)} className="p-2 rounded-lg hover:bg-gray-200 transition-colors" title="Edit text-[#DD4342]">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DD4342" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                            <button onClick={() => handleDelete(row)} className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Delete">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {viewModalOpen && selectedLeave && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#E5E5E5]" onClick={(e) => e.stopPropagation()}>
            <div className="relative flex items-center justify-between px-6 py-5 border-b border-[#EEEEEE] bg-[#FAFAFA]">
              <h3 className="text-xl font-bold text-[#353535]">Leave Details</h3>
              <button onClick={() => setViewModalOpen(false)} className="p-2 rounded-lg hover:bg-[#EEEEEE] transition-colors text-[#616161]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div><p className="text-sm font-semibold text-[#616161] mb-1">Employee Name</p><p className="text-base font-medium text-[#353535]">{selectedLeave.employeeName}</p></div>
                <div><p className="text-sm font-semibold text-[#616161] mb-1">Role</p><p className="text-base font-medium text-[#353535]">{selectedLeave.role ?? "–"}</p></div>
                <div><p className="text-sm font-semibold text-[#616161] mb-1">Leave Type</p><p className="text-base font-medium text-[#353535]">{selectedLeave.leaveType}</p></div>
                <div><p className="text-sm font-semibold text-[#616161] mb-1">Applied On</p><p className="text-base font-medium text-[#353535]">{selectedLeave.appliedOn}</p></div>
                <div><p className="text-sm font-semibold text-[#616161] mb-1">From Date</p><p className="text-base font-medium text-[#353535]">{selectedLeave.fromDate}</p></div>
                <div><p className="text-sm font-semibold text-[#616161] mb-1">To Date</p><p className="text-base font-medium text-[#353535]">{selectedLeave.toDate}</p></div>
              </div>
              <div><p className="text-sm font-semibold text-[#616161] mb-1">Reason</p><div className="bg-[#F8F9FA] p-3 rounded-lg border border-[#EDEFEF] text-base text-[#353535] min-h-[100px]">{selectedLeave.description || "No reason provided"}</div></div>
              <div className="pt-2"><span className={`px-4 py-2 rounded-full text-sm font-semibold ${selectedLeave.currentStatus === "Approved" ? "bg-[#DCFCE7] text-[#15803D]" : selectedLeave.currentStatus === "Rejected" ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#FEF9C3] text-[#854D0E]"}`}>{selectedLeave.currentStatus}</span></div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {applyModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-[#EEEEEE] bg-[#FAFAFA] flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#353535]">Apply Leave</h3>
              <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-gray-100"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmitApply} className="p-6 space-y-4">
               <div className="relative" ref={leaveTypeDropdownRef}>
                <label className="block text-sm font-semibold text-[#353535] mb-2">Leave Type <span className="text-red-500">*</span></label>
                <button type="button" onClick={() => setLeaveTypeOpen(!leaveTypeOpen)} className="w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-left text-sm flex justify-between items-center">
                  <span className={leaveType ? "text-[#353535]" : "text-[#8B8B8B]"}>{leaveType || "Select leave type"}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={leaveTypeOpen ? "rotate-180" : ""}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {leaveTypeOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-lg border border-[#E5E5E5] shadow-lg py-1.5 overflow-hidden">
                    {LEAVE_TYPES.map(t => (
                      <button key={t} type="button" onClick={() => { setLeaveType(t); setLeaveTypeOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">{t}</button>
                    ))}
                  </div>
                )}
                {applyFormErrors.leaveType && <p className="text-xs text-red-500 mt-1">{applyFormErrors.leaveType}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#353535] mb-2">From <span className="text-red-500">*</span></label>
                  <input type="date" value={leaveFrom} min={getTodayInputDate()} onChange={(e) => setLeaveFrom(e.target.value)} className="w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#353535] mb-2">To <span className="text-red-500">*</span></label>
                  <input type="date" value={leaveTo} min={leaveFrom || getTodayInputDate()} onChange={(e) => setLeaveTo(e.target.value)} className="w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#353535] mb-2">Reason <span className="text-red-500">*</span></label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm resize-none" placeholder="Enter reason..." />
                 {applyFormErrors.reason && <p className="text-xs text-red-500 mt-1">{applyFormErrors.reason}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-2.5 rounded-lg bg-gray-100 text-[#616161] font-semibold">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-lg bg-[#DD4342] text-white font-semibold">Submit</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {editModalOpen && editingLeave && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleCloseEditModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-[#EEEEEE] bg-[#FAFAFA] flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#353535]">Edit Leave</h3>
              <button onClick={handleCloseEditModal} className="p-2 rounded-lg hover:bg-gray-100"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4">
               <div className="relative" ref={leaveTypeDropdownEditRef}>
                <label className="block text-sm font-semibold text-[#353535] mb-2">Leave Type <span className="text-red-500">*</span></label>
                <button type="button" onClick={() => setLeaveTypeOpenEdit(!leaveTypeOpenEdit)} className="w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-left text-sm flex justify-between items-center">
                  <span className={leaveType ? "text-[#353535]" : "text-[#8B8B8B]"}>{leaveType || "Select leave type"}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={leaveTypeOpenEdit ? "rotate-180" : ""}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {leaveTypeOpenEdit && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-lg border border-[#E5E5E5] shadow-lg py-1.5 overflow-hidden">
                    {LEAVE_TYPES.map(t => (
                      <button key={t} type="button" onClick={() => { setLeaveType(t); setLeaveTypeOpenEdit(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">{t}</button>
                    ))}
                  </div>
                )}
                {applyFormErrors.leaveType && <p className="text-xs text-red-500 mt-1">{applyFormErrors.leaveType}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#353535] mb-2">From <span className="text-red-500">*</span></label>
                  <input type="date" value={leaveFrom} min={getTodayInputDate()} onChange={(e) => setLeaveFrom(e.target.value)} className="w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#353535] mb-2">To <span className="text-red-500">*</span></label>
                  <input type="date" value={leaveTo} min={leaveFrom || getTodayInputDate()} onChange={(e) => setLeaveTo(e.target.value)} className="w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#353535] mb-2">Reason <span className="text-red-500">*</span></label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full px-4 py-2.5 bg-[#F2F3F4] rounded-lg text-sm resize-none" placeholder="Enter reason..." />
                 {applyFormErrors.reason && <p className="text-xs text-red-500 mt-1">{applyFormErrors.reason}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseEditModal} className="flex-1 py-2.5 rounded-lg bg-gray-100 text-[#616161] font-semibold">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-lg bg-[#DD4342] text-white font-semibold">Update</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
