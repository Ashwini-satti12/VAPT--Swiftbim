import { useEffect, useState, useRef } from "react";
import api from "../../lib/api";

interface AttendanceEntry {
  id: number;
  employee_id?: string;
  full_name?: string;
  date?: string; // DD-MM-YYYY format
  date_iso?: string; // YYYY-MM-DD format
  time_in?: string; // HH:MM:SS format
  time_out?: string | null; // HH:MM:SS format or null
  total_hours?: string | null; // hours as string or null
  status?: string; // "1" for Online, "0" for Offline, or other status
}

export default function TrackerPM() {
  const [list, setList] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Always focus on today's attendance; stored as YYYY-MM-DD
  const getTodayKey = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const [selectedDate] = useState(getTodayKey());
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const statusOptions = ["", "Available", "Busy"];
  const showEntriesOptions: {
    value: string;
    label: string;
    start: number;
    end: number | null;
  }[] = [
    { value: "0-100", label: "0-100", start: 0, end: 100 },
    { value: "101-200", label: "101-200", start: 100, end: 200 },
    { value: "201-300", label: "201-300", start: 200, end: 300 },
    { value: "301-400", label: "301-400", start: 300, end: 400 },
    { value: "all", label: "All", start: 0, end: null },
  ];
  const [selectedShowEntries, setSelectedShowEntries] = useState(
    showEntriesOptions[0].value,
  );
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState("All Time");
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const PER_PAGE = 10;
  const PAGINATION_VISIBLE = 4;
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationWindowStart, setPaginationWindowStart] = useState(1);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const timeDropdownRef = useRef<HTMLDivElement>(null);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const timeRangeOptions = [
    "All Time",
    "09:00 AM - 12:00 PM",
    "12:00 PM - 04:00 PM",
    "04:00 PM - 08:00 PM",
  ];

  // Normalise item date to YYYY-MM-DD for filtering (selectedDate is YYYY-MM-DD)
  const toItemDateKey = (entry: AttendanceEntry): string => {
    if (entry.date_iso) return entry.date_iso;
    const raw = entry.date || "";
    if (!raw) return "";
    const parts = raw.split("-");
    if (parts.length !== 3) return "";
    if (parts[0].length === 4)
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  };

  // Determine status from tasks: if employee has at least one non-completed task
  // on the selected date -> Busy, else Available.
  const getStatus = (entry: AttendanceEntry): "Available" | "Busy" => {
    const name = (entry.full_name || "").trim();
    if (name && busyMap[name]) return "Busy";
    return "Available";
  };

  // Extract pure time (HH:MM:SS) from a time or datetime string
  const extractTime = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    const match = trimmed.match(/(\d{1,2}:\d{2}:\d{2})/);
    return match ? match[1] : trimmed;
  };

  // Format time to HH:MM:SS (24‑hour) for display
  const formatTime = (timeStr: string | null | undefined): string => {
    if (!timeStr || timeStr.trim() === "") return "-";
    try {
      const pure = extractTime(timeStr);
      if (!pure || pure.trim() === "") return "-";
      const [hours, minutes, seconds = "00"] = pure.split(":");
      const h = hours.padStart(2, "0");
      const m = minutes.padStart(2, "0");
      const s = seconds.padStart(2, "0");
      return `${h}:${m}:${s}`;
    } catch {
      return "-";
    }
  };

  // Format total hours
  const formatTotalHours = (
    hours: string | null | undefined,
    timeIn?: string,
    timeOut?: string | null,
  ): string => {
    if (hours && hours.trim() !== "") {
      const numHours = parseFloat(hours);
      if (!isNaN(numHours)) {
        const h = Math.floor(numHours);
        const m = Math.round((numHours - h) * 60);
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
      }
    }
    // If no total_hours, try to calculate from time_in and time_out
    if (timeIn && timeOut) {
      try {
        const [h1, m1, s1] = timeIn.split(":").map(Number);
        const [h2, m2, s2] = timeOut.split(":").map(Number);
        const totalSeconds =
          h2 * 3600 + m2 * 60 + s2 - (h1 * 3600 + m1 * 60 + s1);
        if (totalSeconds > 0) {
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          const s = totalSeconds % 60;
          return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        }
      } catch {
        // Ignore calculation errors
      }
    }
    return "-";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setStatusOpen(false);
      }
      if (
        showEntriesDropdownRef.current &&
        !showEntriesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowEntriesOpen(false);
      }
      if (
        timeDropdownRef.current &&
        !timeDropdownRef.current.contains(event.target as Node)
      ) {
        setTimeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch all attendance data once (same as TrackerTD); filter by date/status on client so we have enough for 10 per page
  useEffect(() => {
    setLoading(true);
    api
      .get<{ records?: AttendanceEntry[] }>("/api/attendance/tracker", {
        params: { roles: "BIM Coordinator,BIM Modeler,BIM Moduler" },
      })
      .then(({ data }) => {
        const records = data.records || [];
        setList(records);
      })
      .catch((error) => {
        console.error("Error fetching attendance data:", error);
        setList([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch tasks for selected date to determine Availability / Busy
  useEffect(() => {
    const fetchTasksForDate = async () => {
      if (!selectedDate) {
        setBusyMap({});
        return;
      }
      try {
        const params: { condition: string } = { condition: "1" }; // management/team view
        const { data } = await api.get<{ tasks?: any[] }>("/api/tasks", {
          params,
        });
        const tasks = data.tasks || [];
        const targetDate = selectedDate; // YYYY-MM-DD
        const busy: Record<string, boolean> = {};

        tasks.forEach((t) => {
          const status = String(t.status || "").toLowerCase();
          if (status === "completed") return;

          const rawDate: string =
            t.start_time || t.Actual_start_time || t.due_date || "";
          if (!rawDate) return;

          const isoPart = String(rawDate).split("T")[0].split(" ")[0];
          if (!isoPart || isoPart !== targetDate) return;

          const name = (t.assigned_full_name || "").trim();
          if (name) busy[name] = true;
        });

        setBusyMap(busy);
      } catch (err) {
        console.error("Error fetching tasks for TrackerPM:", err);
        setBusyMap({});
      }
    };

    fetchTasksForDate();
  }, [selectedDate]);

  useEffect(() => {
    setCurrentPage(1);
    setPaginationWindowStart(1);
  }, [selectedShowEntries, selectedStatus, selectedTimeRange]);

  const filteredList = list.filter((item) => {
    // 1) Always restrict to today's attendance
    const isToday = toItemDateKey(item) === selectedDate;
    if (!isToday) return false;

    // 2) Optional status filter: Available / Busy (derived from tasks)
    if (selectedStatus) {
      if (getStatus(item) !== selectedStatus) return false;
    }

    // 3) Optional time-of-day filter based on time_in
    if (selectedTimeRange !== "All Time" && item.time_in) {
      const [hRaw, mRaw] = item.time_in.split(":");
      const h = Number(hRaw);
      const m = Number(mRaw);
      const minutesFromMidnight = h * 60 + m;

      const rangeMap: Record<string, [number, number]> = {
        "09:00 AM - 12:00 PM": [9 * 60, 12 * 60],
        "12:00 PM - 04:00 PM": [12 * 60, 16 * 60],
        "04:00 PM - 08:00 PM": [16 * 60, 20 * 60],
      };

      const range = rangeMap[selectedTimeRange];
      if (range) {
        const [start, end] = range;
        if (minutesFromMidnight < start || minutesFromMidnight >= end)
          return false;
      }
    }

    return true;
  });

  const selectedRange =
    showEntriesOptions.find((o) => o.value === selectedShowEntries) ??
    showEntriesOptions[0];
  const rangeStart = selectedRange.start;
  const rangeEnd =
    selectedRange.end === null
      ? filteredList.length
      : Math.min(selectedRange.end, filteredList.length);
  const listInRange = filteredList.slice(rangeStart, rangeEnd);
  const totalInRange = listInRange.length;
  const totalPages = Math.max(1, Math.ceil(totalInRange / PER_PAGE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const displayedList = listInRange.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE,
  );

  const pageRanges: { start: number; end: number; label: string }[] = [];
  for (let p = 1; p <= totalPages; p++) {
    const s = rangeStart + (p - 1) * PER_PAGE;
    const e = Math.min(rangeStart + p * PER_PAGE, rangeEnd);
    const label = s === 0 ? `0-${e}` : `${s + 1}-${e}`;
    pageRanges.push({ start: s, end: e, label });
  }
  const _activePage = safePage;
  const maxWindowStart = Math.max(1, totalPages - PAGINATION_VISIBLE + 1);
  const _visiblePageRanges = pageRanges.slice(
    paginationWindowStart - 1,
    paginationWindowStart - 1 + PAGINATION_VISIBLE,
  );
  const _canPrevWindow = paginationWindowStart > 1;
  const _canNextWindow =
    paginationWindowStart <= totalPages - PAGINATION_VISIBLE;
  const _goPrevWindow = () =>
    setPaginationWindowStart((s) => Math.max(1, s - PAGINATION_VISIBLE));
  const _goNextWindow = () =>
    setPaginationWindowStart((s) =>
      Math.min(s + PAGINATION_VISIBLE, maxWindowStart),
    );
  void [_activePage, _visiblePageRanges, _canPrevWindow, _canNextWindow, _goPrevWindow, _goNextWindow];

  const handleDownload = () => {
    if (filteredList.length === 0) return;

    const headers = [
      "Sl.No",
      "Date",
      "Employee Name",
      "Time In",
      "Time Out",
      "Total Hours",
      "Status",
    ];
    const csvData = filteredList.map((entry, index) => {
      const slNo = (index + 1).toString().padStart(2, "0");
      // Format date from DD-MM-YYYY to DD/MM/YYYY for CSV
      const formattedDate = entry.date ? entry.date.replace(/-/g, "/") : "-";
      const timeIn = formatTime(entry.time_in);
      const timeOut = formatTime(entry.time_out);
      const totalHours = formatTotalHours(
        entry.total_hours,
        entry.time_in,
        entry.time_out,
      );
      const status = getStatus(entry);

      return [
        slNo,
        formattedDate,
        entry.full_name || "-",
        timeIn,
        timeOut,
        totalHours,
        status,
      ]
        .map((val) => `"${val}"`)
        .join(",");
    });

    const csvContent = [headers.join(","), ...csvData].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, "0")}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getFullYear()}`;
    link.setAttribute("href", url);
    link.setAttribute("download", `tracking-report-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-1 md:p-2 space-y-8 flex flex-col h-full bg-white">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h2 className="text-[24px] font-semibold text-gray-900 font-Gantari">
            Employee Tracking
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Filter dropdown with AM/PM ranges */}
          <div className="relative min-w-[170px]" ref={timeDropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTimeDropdownOpen((o) => !o);
              }}
              className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#616161"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12" />
                  <polyline points="12 12 16 14" />
                </svg>
                <span className="text-sm font-medium text-[#353535]">
                  {selectedTimeRange}
                </span>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#616161"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: timeDropdownOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {timeDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[170px] py-1">
                {timeRangeOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTimeRange(opt);
                      setTimeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      selectedTimeRange === opt
                        ? "text-[#353535] bg-[#F2F2F2]"
                        : "text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Custom Dropdown */}
          <div className="relative min-w-[120px]" ref={statusDropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setStatusOpen((o) => !o);
              }}
              className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer"
            >
              <span
                className={`text-sm font-medium ${selectedStatus ? "text-[#353535]" : "text-[#8B8B8B]"}`}
              >
                {selectedStatus || "Status"}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#616161"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: statusOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {statusOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[130px] py-1">
                {statusOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStatus(opt);
                      setStatusOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      selectedStatus === opt
                        ? "text-[#353535] bg-[#F2F2F2]"
                        : "text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]"
                    }`}
                  >
                    {opt === "" ? "Status" : opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Show entries dropdown - pill design (same as TrackerTD) */}
          <div className="relative" ref={showEntriesDropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEntriesOpen((o) => !o);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md transition-all cursor-pointer border-0"
            >
              <span className="text-sm font-medium text-[#8B8B8B] font-gantari">
                Show:
              </span>
              <span className="text-sm font-medium text-[#353535] font-gantari">
                {selectedRange.label}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#353535"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: showEntriesOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showEntriesOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] py-1"
                onMouseDown={(e) => e.preventDefault()}
              >
                {showEntriesOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShowEntries(opt.value);
                      setShowEntriesOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium font-gantari transition-colors cursor-pointer ${selectedShowEntries === opt.value ? "text-[#353535] bg-[#F2F2F2]" : "text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={filteredList.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold hover:bg-[#c43a39] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 15V3M12 15L8 11M12 15L16 11M5 20H19"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[16px]">Download</span>
          </button>
        </div>
      </div>

      {/* Table Section - scrollable when many rows */}
      <div className="bg-white rounded-md border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
        <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 min-h-[280px] max-h-[calc(100vh-280px)] pr-1 pb-0">
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[#FFFFFF] after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
              <tr className="bg-white">
                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                  Sl.No
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                  Date
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                  Employee Name
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                  Time In
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                  Time Out  
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                  Total Hours
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-medium text-[#353535] bg-white font-gantari whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayedList.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-12 text-center text-gray-400 font-medium font-gantari bg-white"
                  >
                    No records found
                  </td>
                </tr>
              ) : (
                displayedList.map((entry, index) => {
                  const baseIndex =
                    rangeStart + (safePage - 1) * PER_PAGE + index;
                  const slNo = (baseIndex + 1).toString().padStart(2, "0");
                  const formattedDate = entry.date
                    ? entry.date.replace(/-/g, "/")
                    : "-";
                  const timeIn = formatTime(entry.time_in);
                  const timeOut = formatTime(entry.time_out);
                  const totalHours = formatTotalHours(
                    entry.total_hours,
                    entry.time_in,
                    entry.time_out,
                  );
                  const status = getStatus(entry);
                  return (
                    <tr
                      key={entry.id}
                      className={`${index % 2 === 1 ? "bg-[#F2F2F2] hover:bg-gray-100" : "bg-white"} transition-colors`}
                    >
                      <td className="px-3 py-3 text-center text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">
                        {slNo}
                      </td>
                      <td className="px-3 py-3 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                        {formattedDate}
                      </td>
                      <td className="px-3 py-3 text-center text-[14px] text-[#353535] font-semibold font-gantari whitespace-nowrap align-middle">
                        {entry.full_name ?? "-"}
                      </td>
                      <td className="px-3 py-3 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                        {timeIn}
                      </td>
                      <td className="px-3 py-3 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                        {timeOut}
                      </td>
                      <td className="px-3 py-3 text-center text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">
                        {totalHours}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap align-middle">
                        <span
                          className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari ${
                            status === "Busy"
                              ? "bg-[#FCE8E8] text-[#D93025]"
                              : "bg-[#E6F4EA] text-[#1E7E34]"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
