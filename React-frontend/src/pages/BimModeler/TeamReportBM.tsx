import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/api";

/** Open native date picker — same pattern as TeamreportPM. */
function openNativeDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  try {
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
  } catch {
    // showPicker can throw if not allowed; fall through
  }
  input.focus();
  input.click();
}

interface TimesheetEntry {
  id: number;
  project_name?: string;
  task_name?: string;
  start_time?: string; // ISO format datetime
  end_time?: string; // ISO format datetime
  due_date?: string; // ISO format datetime
  Actual_start_time?: string; // ISO format datetime
  assigned_name?: string;
  teamname?: string;
  Pause?: number; // seconds paused
  restart?: number; // seconds restarted
}

interface Employee {
  id: number;
  full_name: string;
  email?: string;
}

interface Team {
  team_id: number;
  teamname: string;
  employee?: string; // comma-separated employee IDs
}

export default function TeamReportBM() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [employee, setEmployee] = useState("All");
  const [team, setTeam] = useState("All");
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [list, setList] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Refs for click outside detection
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  const employeeOptions = useMemo(
    () => ["All", ...employees.map((e) => e.full_name)],
    [employees],
  );
  const teamOptions = useMemo(
    () => ["All", ...teams.map((t) => t.teamname || `Team ${t.team_id}`)],
    [teams],
  );

  const showEntriesOptions: {
    value: string;
    label: string;
    start: number;
    end: number | null;
  }[] = [
    { value: "show", label: "Show Entries", start: 0, end: 50 },
    { value: "1-50", label: "1-50", start: 0, end: 50 },
    { value: "51-100", label: "51-100", start: 50, end: 100 },
    { value: "101-150", label: "101-150", start: 100, end: 150 },
    { value: "151-200", label: "151-200", start: 150, end: 200 },
    { value: "201-250", label: "201-250", start: 200, end: 250 },
    { value: "251-300", label: "251-300", start: 250, end: 300 },
    { value: "all", label: "All", start: 0, end: null },
  ];
  const [selectedShowEntries, setSelectedShowEntries] = useState(
    showEntriesOptions[0].value,
  );
  const [showEntriesOpen, setShowEntriesOpen] = useState(false);
  const showEntriesDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showEntriesOpen && dropdownContentRef.current) {
      dropdownContentRef.current.scrollTop = 0;
    }
  }, [showEntriesOpen]);

  const toYmd = (v: string | undefined): string => {
    if (!v) return "";
    const s = String(v).trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split("T")[0].split(" ")[0];
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split("/");
      return `${yyyy}-${mm}-${dd}`;
    }
    return "";
  };

  const shiftYmd = (ymd: string, deltaDays: number): string => {
    // Parse YYYY-MM-DD safely without timezone surprises.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
    const [yy, mm, dd] = ymd.split("-").map((x) => Number(x));
    const dt = new Date(Date.UTC(yy, mm - 1, dd));
    dt.setUTCDate(dt.getUTCDate() + deltaDays);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Format date (avoid timezone shifts by not using `new Date(...)` for ISO strings)
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return "-";
    const ymd = toYmd(dateStr);
    if (ymd) {
      const [yyyy, mm, dd] = ymd.split("-");
      return `${dd}/${mm}/${yyyy}`;
    }
    return String(dateStr);
  };

  // Calculate task duration from start_time, end_time, Pause, and restart
  const calculateDuration = (entry: TimesheetEntry): string => {
    // Only use tracked time (start_time and end_time).
    // Fallbacks like Actual_start_time and due_date lead to incorrect, huge durations for tasks that haven't been tracked.
    if (!entry.start_time || !entry.end_time) return "00:00:00";

    try {
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return "00:00:00";

      let totalSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);

      // Subtract pause time and add restart time (these are seconds from the backend)
      const pauseSeconds = entry.Pause || 0;
      const restartSeconds = entry.restart || 0;
      totalSeconds = totalSeconds - pauseSeconds + restartSeconds;

      if (totalSeconds < 0) totalSeconds = 0;

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    } catch {
      return "00:00:00";
    }
  };

  // Fetch employees and teams on mount
  useEffect(() => {
    // Fetch employees
    api
      .get<{ employees?: Employee[] }>("/api/employees")
      .then(({ data }) => {
        const empList = data.employees || [];
        setEmployees(empList);
      })
      .catch((error) => {
        console.error("Error fetching employees:", error);
      });

    // Fetch teams
    api
      .get<{ teams?: Team[] }>("/api/teams")
      .then(({ data }) => {
        const teamList = data.teams || [];
        setTeams(teamList);
      })
      .catch((error) => {
        console.error("Error fetching teams:", error);
      });
  }, []);

  // Fetch timesheet data when filters change
  useEffect(() => {
    setLoading(true);
    const payload: {
      startDate?: string;
      endDate?: string;
      selectmembers?: string;
      selectteam?: string;
    } = {};

    // If user picks only one side of the range, treat it as a single-day filter.
    // Also fix accidental reversed ranges (start > end).
    let effectiveStart = startDate || endDate;
    let effectiveEnd = endDate || startDate;
    if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
      [effectiveStart, effectiveEnd] = [effectiveEnd, effectiveStart];
    }
    // Expand the range slightly so "today" doesn't fail due to timezone/date-format mismatch.
    // We still apply the exact filter on the frontend after receiving results.
    if (effectiveStart) payload.startDate = shiftYmd(effectiveStart, -1);
    if (effectiveEnd) payload.endDate = shiftYmd(effectiveEnd, 1);

    if (employee !== "All") {
      const selectedEmp = employees.find((e) => e.full_name === employee);
      if (selectedEmp) {
        payload.selectmembers = String(selectedEmp.id);
      }
    }

    if (team !== "All") {
      const selectedTeam = teams.find(
        (t) => (t.teamname || `Team ${t.team_id}`) === team,
      );
      if (selectedTeam) {
        payload.selectteam = String(selectedTeam.team_id);
      }
    }

    api
      .post<{ completed_tasks?: TimesheetEntry[] }>(
        "/api/timesheet/completed-tasks",
        payload,
      )
      .then(({ data }) => {
        const tasks = data.completed_tasks || [];
        setList(tasks);
      })
      .catch((error) => {
        console.error("Error fetching timesheet data:", error);
        setList([]);
      })
      .finally(() => setLoading(false));
  }, [startDate, endDate, employee, team, employees, teams]);

  const getTaskDateYmd = (entry: TimesheetEntry): string => {
    // Match the backend intent:
    // 1) use start_time
    // 2) else Actual_start_time
    // 3) else due_date
    const src = entry.start_time || entry.Actual_start_time || entry.due_date;
    return toYmd(src);
  };

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        employeeDropdownRef.current &&
        !employeeDropdownRef.current.contains(event.target as Node)
      ) {
        setEmployeeOpen(false);
      }
      if (
        teamDropdownRef.current &&
        !teamDropdownRef.current.contains(event.target as Node)
      ) {
        setTeamOpen(false);
      }
      if (
        showEntriesDropdownRef.current &&
        !showEntriesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowEntriesOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Client-side fallback filter:
  // The backend filtering is date-range based, but "today" can fail due to timezone/format differences.
  // We filter by comparing the extracted YYYY-MM-DD dates (same extraction used for display).
  const filteredList = useMemo(() => {
    let result = list;
    const effectiveStart = startDate || endDate;
    const effectiveEnd = endDate || startDate;

    if (effectiveStart && effectiveEnd) {
      let s = effectiveStart;
      let e = effectiveEnd;
      if (s > e) [s, e] = [e, s];

      result = result.filter((row) => {
        const ymd = getTaskDateYmd(row);
        if (!ymd) return false;
        return ymd >= s && ymd <= e;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) => {
        const start = formatDate(row.start_time || row.Actual_start_time);
        const end = formatDate(row.end_time || row.due_date);
        const duration = calculateDuration(row);
        return (
          (row.project_name || "").toLowerCase().includes(q) ||
          (row.task_name || "").toLowerCase().includes(q) ||
          (row.assigned_name || "").toLowerCase().includes(q) ||
          (row.teamname || "").toLowerCase().includes(q) ||
          start.toLowerCase().includes(q) ||
          end.toLowerCase().includes(q) ||
          duration.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [list, startDate, endDate, searchQuery]);

  const selectedRange = useMemo(
    () =>
      showEntriesOptions.find((o) => o.value === selectedShowEntries) ??
      showEntriesOptions[0],
    [selectedShowEntries],
  );
  const rangeStart = selectedRange.start;
  const rangeEnd =
    selectedRange.end === null
      ? filteredList.length
      : Math.min(selectedRange.end, filteredList.length);
  const displayedList = useMemo(
    () => filteredList.slice(rangeStart, rangeEnd),
    [filteredList, rangeStart, rangeEnd],
  );

  const handleDownload = () => {
    if (filteredList.length === 0) return;

    const headers = [
      "Sl.No",
      "Project Name",
      "Task",
      "Start Date",
      "End Date",
      "Task Duration",
    ];
    const csvData = filteredList.map((row, index) => {
      const slNo = (index + 1).toString().padStart(2, "0");
      const startDate = formatDate(row.start_time || row.Actual_start_time);
      const endDate = formatDate(row.end_time || row.due_date);
      const duration = calculateDuration(row);

      return [
        slNo,
        row.project_name && row.project_name.trim() !== ""
          ? row.project_name
          : "-",
        row.task_name && row.task_name.trim() !== "" ? row.task_name : "-",
        startDate,
        endDate,
        duration,
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
    link.setAttribute("download", `team-report-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="px-0 pt-2 pb-6 space-y-8 flex flex-col h-full bg-white">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-shrink-0 px-2">
        <h2 className="text-[24px] font-semibold text-[#000000] font-gantari">
          Monthly Report
        </h2>
        <button
          onClick={handleDownload}
          disabled={filteredList.length === 0}
          className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 flex-shrink-0 px-2">
        <div className="flex flex-wrap items-center gap-3">
          {/* Start Date — calendar icon only opens native picker (TeamreportPM pattern) */}
          <div className="relative flex min-w-[130px] items-center justify-between gap-3 rounded-md bg-[#F2F2F2] px-4 py-2 transition-all">
            <span
              className={`select-none text-[14px] font-medium ${startDate ? "text-[#353535]" : "text-[#616161]"}`}
            >
              {startDate
                ? startDate.split("-").reverse().join("/")
                : "Start Date"}
            </span>
            <button
              type="button"
              aria-label="Open start date calendar"
              onClick={() => openNativeDatePicker(startDateInputRef.current)}
              className="shrink-0 cursor-pointer rounded p-0.5 outline-none transition-colors hover:bg-[#DCDCDC] focus-visible:ring-2 focus-visible:ring-[#DD4342]/40"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#616161"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01" />
              </svg>
            </button>
            <input
              ref={startDateInputRef}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              tabIndex={-1}
              className="pointer-events-none absolute inset-0 h-full min-h-[2.5rem] w-full opacity-0"
              style={{ colorScheme: "light" }}
            />
          </div>

          {/* End Date — calendar icon only opens native picker */}
          <div className="relative flex min-w-[130px] items-center justify-between gap-3 rounded-md bg-[#F2F2F2] px-4 py-2 transition-all">
            <span
              className={`select-none text-[14px] font-medium ${endDate ? "text-[#353535]" : "text-[#616161]"}`}
            >
              {endDate ? endDate.split("-").reverse().join("/") : "End Date"}
            </span>
            <button
              type="button"
              aria-label="Open end date calendar"
              onClick={() => openNativeDatePicker(endDateInputRef.current)}
              className="shrink-0 cursor-pointer rounded p-0.5 outline-none transition-colors hover:bg-[#DCDCDC] focus-visible:ring-2 focus-visible:ring-[#DD4342]/40"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#616161"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01" />
              </svg>
            </button>
            <input
              ref={endDateInputRef}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              tabIndex={-1}
              className="pointer-events-none absolute inset-0 h-full min-h-[2.5rem] w-full opacity-0"
              style={{ colorScheme: "light" }}
            />
          </div>

          {/* Employee Custom Dropdown */}
          <div className="relative min-w-[130px]" ref={employeeDropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEmployeeOpen((o) => !o);
                setTeamOpen(false);
              }}
              className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer"
            >
              <span
                className={`text-[14px] font-medium ${employee !== "All" ? "text-[#353535]" : "text-[#616161]"}`}
              >
                {employee === "All" ? "Employee" : employee}
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
                  transform: employeeOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {employeeOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[160px] py-1 max-h-[300px] overflow-y-auto">
                {employeeOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEmployee(opt);
                      setEmployeeOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      employee === opt
                        ? "text-[#353535] bg-gray-50"
                        : "text-[#616161] hover:text-[#353535] hover:bg-[#F2F2F2]"
                    }`}
                  >
                    {opt === "All" ? "Employee" : opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Team Custom Dropdown */}
          <div className="relative min-w-[100px]" ref={teamDropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTeamOpen((o) => !o);
                setEmployeeOpen(false);
                setShowEntriesOpen(false);
              }}
              className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer"
            >
              <span
                className={`text-[14px] font-medium ${team !== "All" ? "text-[#353535]" : "text-[#616161]"}`}
              >
                {team === "All" ? "Team" : team}
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
                  transform: teamOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {teamOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md min-w-[130px] py-1 max-h-[300px] overflow-y-auto">
                {teamOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTeam(opt);
                      setTeamOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      team === opt
                        ? "text-[#353535] bg-gray-50"
                        : "text-[#616161] hover:text-[#353535] hover:bg-[#F2F2F2]"
                    }`}
                  >
                    {opt === "All" ? "Team" : opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Show entries dropdown */}
          <div className="relative" ref={showEntriesDropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEntriesOpen((o) => !o);
                setTeamOpen(false);
                setEmployeeOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#F2F2F2] rounded-md transition-all cursor-pointer border-0"
            >
              {selectedShowEntries === "show" ? (
                <span className="text-[14px] font-medium text-[#616161] font-gantari">
                  Show Entries
                </span>
              ) : (
                <>
                  <span className="text-[14px] font-medium text-[#353535] font-gantari">
                    Show Entries:
                  </span>
                  <span className="text-[14px] font-medium text-[#353535] font-gantari">
                    {selectedRange.label}
                  </span>
                </>
              )}
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
                ref={dropdownContentRef}
                className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-md min-w-[120px] py-1 max-h-[160px] overflow-y-auto custom-scrollbar"
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
                    className={`w-full text-left px-4 py-2 text-[14px] font-medium font-gantari transition-colors cursor-pointer ${selectedShowEntries === opt.value ? "text-[#353535] bg-[#F2F2F2]" : "text-[#616161] hover:text-[#353535] hover:bg-[#F2F2F2]"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 pr-1 pb-0">
            <table className="min-w-full border-collapse table-fixed">
              <thead className="relative after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-[rgb(89,89,89)]/20">
                <tr className="bg-white">
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">
                    Sl.No
                  </th>
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">
                    Project Name
                  </th>
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">
                    Task Name
                  </th>
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">
                    Start Date
                  </th>
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">
                    End Date
                  </th>
                  <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535] bg-white font-gantari whitespace-nowrap">
                    Task Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-400 font-medium"
                    >
                      No records found
                    </td>
                  </tr>
                ) : (
                  displayedList.map((row, index) => {
                    const slNo = (rangeStart + index + 1)
                      .toString()
                      .padStart(2, "0");
                    const startDate = formatDate(
                      row.start_time || row.Actual_start_time,
                    );
                    const endDate = formatDate(row.end_time || row.due_date);
                    const duration = calculateDuration(row);

                    return (
                      <tr
                        key={row.id}
                        className={`${index % 2 === 1 ? "bg-[#F2F2F2] hover:bg-gray-100" : "bg-white"} transition-colors`}
                      >
                        <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">
                          {slNo}
                        </td>
                        <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-semibold font-gantari whitespace-nowrap align-middle">
                          {row.project_name && row.project_name.trim() !== ""
                            ? row.project_name
                            : "-"}
                        </td>
                        <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari align-middle">
                          <div className="mx-auto max-w-[200px] line-clamp-2 break-words text-center">
                            {row.task_name && row.task_name.trim() !== ""
                              ? row.task_name
                              : "-"}
                          </div>
                        </td>
                        <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                          {startDate}
                        </td>
                        <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-gantari whitespace-nowrap align-middle">
                          {endDate}
                        </td>
                        <td className="px-3 py-6 text-center text-[14px] text-[#353535] font-medium font-gantari whitespace-nowrap align-middle">
                          {duration}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .smooth-scroll {
          scroll-behavior: smooth;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #8c8c8c #f3f3f3;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f3f3f3;
          border-radius: 20px;
          margin: 10px 0;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #8c8c8c;
          border-radius: 20px;
          border: 2px solid #f3f3f3;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #666666;
        }
      `}</style>
    </div>
  );
}
