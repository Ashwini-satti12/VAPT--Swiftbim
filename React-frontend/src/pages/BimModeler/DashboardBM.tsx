import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { getGlobalProfileUrl } from "../../lib/profileHelpers";

const MONTH_NAMES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) =>
  new Date(2000, m, 1).toLocaleString("default", { month: "long" }),
);

type DashboardStats = {
  totalProjects: number;
  completedProjects: number;
  inProgressTasks: number;
  completedTasks: number;
  myInProgressTasks?: number;
  teamInProgressTasks?: number;
  myCompletedTasks?: number;
  teamCompletedTasks?: number;
};

type InvolvedPerson = {
  id: number;
  full_name: string;
  profile_picture: string | null;
};
type PriorityTask = {
  id: number;
  task_name: string;
  due_date: string;
  status: string;
  category: string | null;
  perferstart_time: string | null;
  perferend_time: string | null;
  projectid?: number;
  project_name?: string;
  involved_persons: InvolvedPerson[];
};

const defaultStats: DashboardStats = {
  totalProjects: 0,
  completedProjects: 0,
  inProgressTasks: 0,
  completedTasks: 0,
  myInProgressTasks: 0,
  teamInProgressTasks: 0,
  myCompletedTasks: 0,
  teamCompletedTasks: 0,
};

/** Match MytaskBM.tsx: personal list is assigned_to OR uploaderid; stats API only counts assigned_to. */
type MyTaskRow = { id: number; status?: string; Approval?: string };

function bmMyTaskNormalizeStatus(
  s: string | undefined,
  approval?: string,
): "todo" | "in_progress" | "completed" {
  if (approval?.toLowerCase() === "approved") return "completed";
  if (approval?.toLowerCase() === "rejected") return "todo";
  if (!s) return "todo";
  const lower = s.toLowerCase().replace(/\s+/g, "_");
  if (lower.includes("progress") || lower === "in_progress") return "in_progress";
  if (lower.includes("complete") || lower === "done") return "completed";
  return "todo";
}

function formatDateOnly(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return "—";
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function parseTaskDateTime(
  dateStr: string,
  timeStr: string | null | undefined,
): Date | null {
  if (!dateStr || !(timeStr || "").trim()) return null;
  const t = (timeStr || "").trim();
  const normalized = t.length === 5 ? t + ":00" : t;
  const date = new Date(dateStr + "T" + normalized);
  return isNaN(date.getTime()) ? null : date;
}
function formatTimeStringToAMPM(timeStr: string | null | undefined): string {
  if (!timeStr || !timeStr.trim()) return "—";
  const parts = timeStr.trim().split(":");
  const h = parseInt(parts[0], 10);
  const m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
  if (isNaN(h)) return "—";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function taskProgressAndCountdown(
  dueDate: string,
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  nowMs: number = Date.now(),
): { progress: number; countdown: string } {
  const start = parseTaskDateTime(dueDate, startTime);
  const end = parseTaskDateTime(dueDate, endTime);
  if (!start || !end || end.getTime() <= start.getTime())
    return { progress: 0, countdown: "—" };
  const startMs = start.getTime(),
    endMs = end.getTime();
  let progress = 0;
  if (nowMs >= endMs) progress = 100;
  else if (nowMs > startMs)
    progress = Math.round(((nowMs - startMs) / (endMs - startMs)) * 100);
  const remaining = Math.floor((endMs - nowMs) / 1000);
  const countdown =
    remaining <= 0
      ? "0:00:00"
      : `${Math.floor(remaining / 3600)}:${String(Math.floor((remaining % 3600) / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  return { progress, countdown };
}
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 36;

type CelebrationEvent = {
  type: "birthday" | "work_anniversary" | "project_due";
  full_name?: string;
  image?: string | null;
  working_years?: number;
  project_name?: string;
  due_date?: string;
};

export default function DashboardBM() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [priorityTasks, setPriorityTasks] = useState<PriorityTask[]>([]);
  const [searchParams] = useSearchParams();
  const searchQuery = (searchParams.get("q") || "").toLowerCase();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
  const [celebrations, setCelebrations] = useState<CelebrationEvent[]>([]);
  const today = new Date();
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(
    () => new Date(today.getTime()),
  );
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  // Project KPIs from dashboard API; task counts from same merge as MytaskBM (default /bm/mytasks view).
  useEffect(() => {
    api.get<DashboardStats>("/api/dashboard/stats")
      .then(({ data }) => setStats(data))
      .catch(() => setStats(defaultStats))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    api
      .get<{ tasks: PriorityTask[] }>("/api/dashboard/priority-tasks")
      .then(({ data }) =>
        setPriorityTasks(Array.isArray(data.tasks) ? data.tasks : []),
      )
      .catch(() => setPriorityTasks([]));
  }, []);

  const filteredPriorityTasks = useMemo(() => {
    if (!searchQuery) return priorityTasks;
    return priorityTasks.filter(
      (t) =>
        (t.task_name || "").toLowerCase().includes(searchQuery) ||
        (t.project_name || "").toLowerCase().includes(searchQuery),
    );
  }, [priorityTasks, searchQuery]);

  useEffect(() => {
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    api
      .get<{ events: CelebrationEvent[] }>("/api/calendar/events", {
        params: { selectedDate: dateStr },
      })
      .then(({ data }) => setCelebrations(data.events ?? []))
      .catch(() => setCelebrations([]));
  }, [selectedDate]);

  useEffect(() => {
    if (!monthDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        monthDropdownRef.current &&
        !monthDropdownRef.current.contains(e.target as Node)
      ) {
        setMonthDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [monthDropdownOpen]);

  const currentDayName = selectedDate
    .toLocaleString("default", { weekday: "long" })
    .toUpperCase();
  const currentMonthName = new Date(
    displayYear,
    displayMonth,
    1,
  ).toLocaleString("default", { month: "long" });

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(displayYear, displayMonth);
  const firstDay = getFirstDayOfMonth(displayYear, displayMonth);
  const prevMonthDays = getDaysInMonth(
    displayMonth === 0 ? displayYear - 1 : displayYear,
    displayMonth === 0 ? 11 : displayMonth - 1,
  );

  const calendarDays: { day: number; type: "prev" | "current" | "next" }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, type: "prev" });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, type: "current" });
  }
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      calendarDays.push({ day: i, type: "next" });
    }
  }

  const getCellDate = (cell: {
    day: number;
    type: "prev" | "current" | "next";
  }): Date => {
    if (cell.type === "current")
      return new Date(displayYear, displayMonth, cell.day);
    if (cell.type === "prev") {
      const prevM = displayMonth === 0 ? 11 : displayMonth - 1;
      const prevY = displayMonth === 0 ? displayYear - 1 : displayYear;
      return new Date(prevY, prevM, cell.day);
    }
    const nextM = displayMonth === 11 ? 0 : displayMonth + 1;
    const nextY = displayMonth === 11 ? displayYear + 1 : displayYear;
    return new Date(nextY, nextM, cell.day);
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const goPrevMonth = () => {
    if (displayMonth === 0) {
      setDisplayYear((y: number) => y - 1);
      setDisplayMonth(11);
    } else setDisplayMonth((m: number) => m - 1);
  };
  const goNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayYear((y: number) => y + 1);
      setDisplayMonth(0);
    } else setDisplayMonth((m: number) => m + 1);
  };

  const handleDateClick = (cell: {
    day: number;
    type: "prev" | "current" | "next";
  }) => {
    const d = getCellDate(cell);
    setSelectedDate(d);
    setDisplayMonth(d.getMonth());
    setDisplayYear(d.getFullYear());
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
        {/* Header and KPI Cards */}
        <div className="bg-white pb-6 pt-0 border-b border-transparent shrink-0">
          <h1 className="text-xl font-medium font-gantari text-slate-800 mb-6">Dashboard</h1>
          {/* KPI Grid — same style as DashboardTD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link to="/bm/mytasks" className="bg-[#F2F2F2] group hover:bg-[#DD4342] rounded-md border border-[#AEACAC52] px-4 py-6 shadow-sm flex items-center justify-between min-h-0 cursor-pointer no-underline">
              <h3 className="text-[16px] sm:text-[18px] text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari">Total Projects</h3>
              <p className="text-[18px] sm:text-[20px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">{stats.totalProjects}</p>
            </Link>
            <Link to="/bm/mytasks" className="bg-[#F2F2F2] group hover:bg-[#DD4342] rounded-md border border-[#AEACAC52] px-4 py-6 shadow-sm flex items-center justify-between min-h-0 cursor-pointer no-underline">
              <h3 className="text-[16px] sm:text-[18px] text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari">Completed Projects</h3>
              <p className="text-[18px] sm:text-[20px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">{stats.completedProjects}</p>
            </Link>
            <Link to="/bm/mytasks" className="bg-[#F2F2F2] group hover:bg-[#DD4342] rounded-md border border-[#AEACAC52] px-4 py-6 shadow-sm flex items-center justify-between min-h-0 cursor-pointer no-underline">
              <h3 className="text-[16px] sm:text-[18px] text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari">In-Progress Task</h3>
              <p className="text-[18px] sm:text-[20px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">{stats.inProgressTasks}</p>
            </Link>
            <Link to="/bm/mytasks" className="bg-[#F2F2F2] group hover:bg-[#DD4342] rounded-md border border-[#AEACAC52] px-4 py-6 shadow-sm flex items-center justify-between min-h-0 cursor-pointer no-underline">
              <h3 className="text-[16px] sm:text-[18px] text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari">Completed Task</h3>
              <p className="text-[18px] sm:text-[20px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">{stats.completedTasks}</p>
            </Link>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-4 overflow-visible lg:overflow-hidden">
          {/* Today's Priority — projects with today's tasks (same as DashboardTD) */}
          <div className="lg:col-span-2 flex flex-col bg-white rounded-md border border-[#AEACAC52] shadow-sm pt-4 pl-4 pb-4 pr-0 h-[500px] lg:h-full overflow-hidden">
            <div className="mb-4 shrink-0">
              <h2 className="text-xl font-semibold text-[#353535] font-gantari">Today's Priority</h2>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
              {filteredPriorityTasks.length === 0 ? (
                <p className="text-[#717171] text-sm font-gantari py-4">{searchQuery ? "No matching tasks found." : "No priority tasks for today."}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-[#353535] font-gantari">Projects</h3>
                    <Link to="/bm/mytasks" className="text-sm font-medium text-[#DE3D3A] hover:underline font-gantari cursor-pointer">View all</Link>
                  </div>
                  {(() => {
                    const byProject = new Map<number, { projectName: string; tasks: PriorityTask[] }>();
                    for (const task of filteredPriorityTasks) {
                      const pid = task.projectid ?? 0;
                      const name = task.project_name || `Project #${pid}`;
                      if (!byProject.has(pid)) byProject.set(pid, { projectName: name, tasks: [] });
                      byProject.get(pid)!.tasks.push(task);
                    }
                    return Array.from(byProject.entries()).map(([id, { projectName, tasks: projectTasks }]) => (
                      <div key={id} className="mb-6">
                        <p className="text-sm font-semibold text-[#353535] font-gantari mb-3 truncate pr-2">
                          <Link to="/bm/mytasks" className="hover:text-[#DE3D3A] hover:underline cursor-pointer" title={projectName}>{projectName}</Link>
                        </p>
                        <div className="space-y-4">
                          {projectTasks.map((task) => {
                            const { progress, countdown } = taskProgressAndCountdown(task.due_date, task.perferstart_time, task.perferend_time, nowMs);
                            const strokeOffset = CIRCLE_CIRCUMFERENCE * (1 - progress / 100);
                            const dateLabel = formatDateOnly(task.due_date);
                            const hasStart = (task.perferstart_time || '').trim().length > 0;
                            const hasEnd = (task.perferend_time || '').trim().length > 0;
                            const timeRangeLabel = hasStart || hasEnd ? `${hasStart ? formatTimeStringToAMPM(task.perferstart_time) : '—'} — ${hasEnd ? formatTimeStringToAMPM(task.perferend_time) : '—'}` : '—';
                            return (
                              <div key={task.id} className="flex items-center gap-5 p-5 bg-[#F8F8F8] rounded-xl border border-slate-200/80 shadow-sm relative">
                                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                                  <svg className="w-full h-full -rotate-90">
                                    <circle cx="40" cy="40" r="36" stroke="#E5E7EB" strokeWidth="5" fill="transparent" className="opacity-60" />
                                    <circle cx="40" cy="40" r="36" stroke="#00882E" strokeWidth="5" fill="transparent" strokeDasharray={CIRCLE_CIRCUMFERENCE} strokeDashoffset={strokeOffset} strokeLinecap="round" />
                                  </svg>
                                  <span className="absolute text-[10px] font-bold text-black font-mono">{countdown}</span>
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                  <h3 className="text-xl font-bold text-black truncate mb-0.5">{task.task_name ?? 'Task'}</h3>
                                  <p className="text-[14px] text-[#6B7280] font-medium leading-tight">{dateLabel} — {timeRangeLabel}</p>
                                </div>
                                <div className="absolute top-4 right-4">
                                  <span className="bg-[#3B82F6] text-white text-[12px] px-3.5 py-1 rounded-md font-medium font-gantari tracking-tight">{task.category || 'Task'}</span>
                                </div>
                                <div className="absolute bottom-4 right-4 flex -space-x-4">
                                  {(task.involved_persons?.length ? task.involved_persons : [])
                                    .slice(0, 3)
                                    .map((person) => (
                                      <div
                                        key={person.id}
                                        className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-sm flex items-center justify-center overflow-hidden"
                                        title={person.full_name}
                                      >
                                        {person.profile_picture ? (
                                          <img
                                            src={getGlobalProfileUrl(person.id, person.profile_picture)}
                                            alt=""
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-[#E5E5E5] flex items-center justify-center text-[11px] font-bold text-[#353535]">
                                            {person.full_name?.slice(0, 2).toUpperCase() || '?'}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </>
              )}
            </div>
          </div>



          <div className="lg:col-span-1 flex flex-col h-[600px] lg:h-full overflow-hidden">
            <div className="bg-white rounded-md border border-[#AEACAC52] pl-4 pb-4 pr-0 shadow-sm flex flex-col h-full min-h-0">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0 pt-2 px-2">
                <div className="flex flex-col items-start min-w-[70px]">
                  <span className="text-[15px] lg:text-[17px] font-semibold text-black font-gantari leading-tight">{currentMonthName}</span>
                  <span className="text-[15px] lg:text-[17px] font-semibold text-black font-gantari leading-tight">{displayYear}</span>
                </div>
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <span className="text-[38px] lg:text-[32px] font-bold text-black leading-none tracking-tighter">{selectedDate.getDate()}</span>
                </div>
                <div className="flex flex-col items-end min-w-[75px]">
                  <span className="text-[13px] lg:text-[16px] font-semibold text-black font-gantari tracking-wide">{currentDayName}</span>
                </div>
              </div>

              <div className="flex flex-nowrap items-center justify-center gap-2 sm:gap-4 mb-3 px-2 shrink-0">
                <button type="button" onClick={goPrevMonth} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-black transition-colors cursor-pointer" aria-label="Previous month">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="relative min-w-[100px]" ref={monthDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setMonthDropdownOpen((o: boolean) => !o)}
                    className="flex items-center justify-between gap-1 w-full rounded-md py-2 pl-0 pr-6 text-left text-[13px] font-medium text-slate-800 hover:bg-slate-50 font-gantari border-none bg-transparent cursor-pointer"
                    aria-expanded={monthDropdownOpen}
                    aria-haspopup="listbox"
                    aria-label="Select month"
                  >
                    {currentMonthName}
                    <svg className={`w-3.5 h-3.5 text-slate-500 absolute right-0 top-1/2 -translate-y-1/2 transition-transform ${monthDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {monthDropdownOpen && (
                    <div className="absolute left-0 top-full z-30 mt-2 min-w-[140px] rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 overflow-hidden" role="listbox">
                      <div className="overflow-y-auto custom-scrollbar overscroll-contain" style={{ maxHeight: '160px' }}>
                        {MONTH_NAMES.map((name, m) => {
                          const isSelected = m === displayMonth;
                          return (
                            <button
                              key={m}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => { setDisplayMonth(m); setMonthDropdownOpen(false); }}
                              className={`block w-full px-4 py-2.5 text-left text-[13px] font-medium font-gantari transition-colors truncate cursor-pointer ${isSelected ? 'bg-[#2563eb] text-white' : 'text-slate-800 hover:bg-slate-100'}`}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="min-w-[40px] text-[13px] font-semibold text-slate-700 font-gantari">{displayYear}</span>
                  <div className="flex flex-col gap-0 -space-y-px">
                    <button type="button" onClick={() => setDisplayYear((y: number) => y + 1)} className="py-0 px-0.5 flex items-center justify-center text-slate-700 hover:bg-slate-50 rounded-sm leading-none cursor-pointer" aria-label="Next year">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z" /></svg>
                    </button>
                    <button type="button" onClick={() => setDisplayYear((y: number) => y - 1)} className="py-0 px-0.5 flex items-center justify-center text-slate-700 hover:bg-slate-50 rounded-sm leading-none cursor-pointer" aria-label="Previous year">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z" /></svg>
                    </button>
                  </div>
                </div>
                <button type="button" onClick={goNextMonth} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-black transition-colors" aria-label="Next month">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar pl-2 pr-2">
                {isCalendarExpanded && (
                  <div className="mb-2 py-2 animate-in fade-in duration-200">
                    <div className="grid grid-cols-7 gap-0 text-center text-[12px] lg:text-[13px] font-bold text-black font-gantari mb-2 [&>div]:py-0.5">
                      <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                    </div>
                    <div className="grid grid-cols-7 gap-y-1 text-center text-[13px] lg:text-[14px] font-semibold font-gantari">
                      {calendarDays.map((cell, i) => {
                        const cellDate = getCellDate(cell);
                        const isSelected = isSameDay(cellDate, selectedDate);
                        const isToday = isSameDay(cellDate, today);
                        const isOtherMonth = cell.type === 'prev' || cell.type === 'next';
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleDateClick(cell)}
                            className={`py-1 min-w-[22px] transition-colors rounded-full cursor-pointer ${isToday ? 'bg-[#DD4346] text-[#FFFFFF]' : isSelected ? 'text-[#E00100] font-bold' : isOtherMonth ? 'text-[#9CA3AF]' : 'text-black hover:bg-slate-50'}`}
                          >
                            {cell.day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-center mt-0 mb-2">
                  <button
                    onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                    className="text-slate-500 hover:text-slate-700 transition-colors p-0.5"
                    aria-label={isCalendarExpanded ? 'Collapse calendar' : 'Expand calendar'}
                  >
                    <svg className={`w-5 h-4 transform transition-transform ${!isCalendarExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4 pr-1">
                  {celebrations.length === 0 ? (
                    <p className="text-sm text-slate-400 font-gantari py-4 text-center">No celebrations for this date.</p>
                  ) : (
                    celebrations.map((event: CelebrationEvent, i: number) => (
                      <div key={i} className="bg-[#F8F9FA] p-5 rounded-xl border border-transparent hover:border-slate-200 transition-all flex flex-col relative">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-[#353535] text-[17px] font-gantari">{event.full_name || event.project_name || 'Employee'}</h4>
                          <span className={`text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-widest leading-none font-gantari ${event.type === 'birthday' ? 'bg-[#FFF3E0] text-[#E65100]' : event.type === 'work_anniversary' ? 'bg-[#E7F6EA] text-[#2D8A39]' : 'bg-[#E3F2FD] text-[#1565C0]'
                            }`}>
                            {event.type === 'birthday' ? 'BIRTHDAY' : event.type === 'work_anniversary' ? 'CELEBRATIONS' : 'PROJECT DUE'}
                          </span>
                        </div>
                        {event.type === 'birthday' && (
                          <>
                            <p className="text-[15px] font-semibold text-slate-700 mb-1 font-gantari">Happy Birthday 🎂</p>
                            <p className="text-sm text-slate-400 leading-relaxed font-gantari">Wishing you a wonderful birthday! May this year bring you happiness and success.</p>
                          </>
                        )}
                        {event.type === 'work_anniversary' && (
                          <>
                            <p className="text-[15px] font-semibold text-slate-700 mb-1 font-gantari">Congratulations</p>
                            <p className="text-sm text-slate-400 leading-relaxed font-gantari">
                              {event.working_years === 1 ? 'Congratulations for your first anniversary! Marking a great year of excellence.' : `You have completed ${event.working_years} years in our company. Marking another year of excellence.`}
                            </p>
                          </>
                        )}
                        {event.type === 'project_due' && (
                          <>
                            <p className="text-[15px] font-semibold text-slate-700 mb-1 font-gantari">Project Due</p>
                            <p className="text-sm text-slate-400 leading-relaxed font-gantari">Project "{event.project_name}" is due on {event.due_date}.</p>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      {/* Header and KPI Cards */}
      <div className="bg-white pb-6 pt-0 border-b border-transparent shrink-0">
        <h1 className="text-[24px] font-medium font-gantari text-slate-800 mb-6">
          Dashboard
        </h1>
        {/* KPI Grid — same style as DashboardTD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            to="/bm/mytasks"
            className="bg-[#F2F3F4] group hover:bg-[#DD4342] rounded-md border border-[#AEACAC52] px-4 py-6 flex items-center justify-between min-h-0 cursor-pointer no-underline transition-all duration-300"
          >
            <h3 className="text-sm sm:text-[18px] text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari">
              Total Projects
            </h3>
            <p className="text-xl sm:text-[20px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">
              {stats.totalProjects}
            </p>
          </Link>
          <Link
            to="/bm/mytasks"
            className="bg-[#F2F3F4] group hover:bg-[#DD4342] rounded-md border border-[#AEACAC52] px-4 py-6 flex items-center justify-between min-h-0 cursor-pointer no-underline transition-all duration-300"
          >
            <h3 className="text-sm sm:text-[18px] text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari">
              Completed Projects
            </h3>
            <p className="text-xl sm:text-[20px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">
              {stats.completedProjects}
            </p>
          </Link>
          <Link
            to="/bm/mytasks"
            className="bg-[#F2F3F4] group hover:bg-[#DD4342] rounded-md border border-[#AEACAC52] px-4 py-6 flex items-center justify-between min-h-0 cursor-pointer no-underline transition-all duration-300"
          >
            <h3 className="text-sm sm:text-[18px] text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari">
              In-Progress Task
            </h3>
            <p className="text-xl sm:text-[20px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">
              {stats.inProgressTasks}
            </p>
          </Link>
          <Link
            to="/bm/mytasks"
            className="bg-[#F2F3F4] group hover:bg-[#DD4342] rounded-md border border-[#AEACAC52] px-4 py-6 flex items-center justify-between min-h-0 cursor-pointer no-underline transition-all duration-300"
          >
            <h3 className="text-sm sm:text-[18px] text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari">
              Completed Task
            </h3>
            <p className="text-xl sm:text-[20px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">
              {stats.completedTasks}
            </p>
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-4 overflow-y-auto lg:overflow-hidden pr-1 custom-scrollbar">
        {/* Today's Priority — projects with today's tasks (same as DashboardTD) */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-[#AEACAC52] shadow-sm pt-4 pl-4 pb-4 pr-0 h-[500px] lg:h-full overflow-hidden">
          <div className="mb-4 shrink-0">
            <h2 className="text-[18px] font-medium text-[#353535] font-gantari">
              Today's Priority
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
            {filteredPriorityTasks.length === 0 ? (
              <p className="text-[#717171] text-[14px] font-gantari">
                {searchQuery
                  ? "No matching tasks found."
                  : "No priority tasks for today."}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[16px] font-medium text-[#353535] font-gantari">
                    Projects
                  </h3>
                  <Link
                    to="/bm/mytasks"
                    className="text-[14px] font-medium text-[#DE3D3A] font-gantari cursor-pointer"
                  >
                    View all
                  </Link>
                </div>
                {(() => {
                  const byProject = new Map<
                    number,
                    { projectName: string; tasks: PriorityTask[] }
                  >();
                  for (const task of filteredPriorityTasks) {
                    const pid = task.projectid ?? 0;
                    const name = task.project_name || `Project #${pid}`;
                    if (!byProject.has(pid))
                      byProject.set(pid, { projectName: name, tasks: [] });
                    byProject.get(pid)!.tasks.push(task);
                  }
                  return Array.from(byProject.entries()).map(
                    ([id, { projectName, tasks: projectTasks }]) => (
                      <div key={id} className="mb-6">
                        <p className="text-sm font-semibold text-[#353535] font-gantari mb-3 truncate pr-2">
                          <Link
                            to="/bm/mytasks"
                            className="hover:text-[#DE3D3A] hover:underline cursor-pointer"
                            title={projectName}
                          >
                            {projectName}
                          </Link>
                        </p>
                        <div className="space-y-4">
                          {projectTasks.map((task) => {
                            const { progress, countdown } =
                              taskProgressAndCountdown(
                                task.due_date,
                                task.perferstart_time,
                                task.perferend_time,
                                nowMs,
                              );
                            const strokeOffset =
                              CIRCLE_CIRCUMFERENCE * (1 - progress / 100);
                            const dateLabel = formatDateOnly(task.due_date);
                            const hasStart =
                              (task.perferstart_time || "").trim().length > 0;
                            const hasEnd =
                              (task.perferend_time || "").trim().length > 0;
                            const timeRangeLabel =
                              hasStart || hasEnd
                                ? `${hasStart ? formatTimeStringToAMPM(task.perferstart_time) : "—"} — ${hasEnd ? formatTimeStringToAMPM(task.perferend_time) : "—"}`
                                : "—";
                            return (
                              <div
                                key={task.id}
                                className="flex items-center gap-5 p-5 bg-[#F8F8F8] rounded-xl border border-slate-200/80 shadow-sm relative"
                              >
                                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                                  <svg className="w-full h-full -rotate-90">
                                    <circle
                                      cx="40"
                                      cy="40"
                                      r="36"
                                      stroke="#E5E7EB"
                                      strokeWidth="5"
                                      fill="transparent"
                                      className="opacity-60"
                                    />
                                    <circle
                                      cx="40"
                                      cy="40"
                                      r="36"
                                      stroke="#00882E"
                                      strokeWidth="5"
                                      fill="transparent"
                                      strokeDasharray={CIRCLE_CIRCUMFERENCE}
                                      strokeDashoffset={strokeOffset}
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                  <span className="absolute text-[10px] font-bold text-black font-mono">
                                    {countdown}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                  <h3 className="text-xl font-bold text-black truncate mb-0.5">
                                    {task.task_name ?? "Task"}
                                  </h3>
                                  <p className="text-[14px] text-[#6B7280] font-medium leading-tight">
                                    {dateLabel} — {timeRangeLabel}
                                  </p>
                                </div>
                                <div className="absolute top-4 right-4">
                                  <span className="bg-[#3B82F6] text-white text-[12px] px-3.5 py-1 rounded-md font-medium font-gantari tracking-tight">
                                    {task.category || "Task"}
                                  </span>
                                </div>
                                <div className="absolute bottom-4 right-4 flex -space-x-4">
                                  {(task.involved_persons?.length
                                    ? task.involved_persons
                                    : []
                                  )
                                    .slice(0, 3)
                                    .map((person) => (
                                      <div
                                        key={person.id}
                                        className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-sm flex items-center justify-center overflow-hidden"
                                        title={person.full_name}
                                      >
                                        {person.profile_picture ? (
                                          <img
                                            src={getGlobalProfileUrl(
                                              person.id,
                                              person.profile_picture,
                                            )}
                                            alt=""
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-[#E5E5E5] flex items-center justify-center text-[11px] font-bold text-[#353535]">
                                            {person.full_name
                                              ?.slice(0, 2)
                                              .toUpperCase() || "?"}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ),
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* Calendar & Celebrations — same design as DashboardTD */}
        <div className="lg:col-span-1 flex flex-col h-[600px] lg:h-full overflow-hidden">
          <div className="bg-white rounded-2xl border border-[#AEACAC52] pl-4 pb-4 pr-0 shadow-sm flex flex-col h-full min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0 pt-2 px-2">
              <div className="flex flex-col items-start min-w-[70px]">
                <span className="text-[15px] lg:text-[17px] font-semibold text-black font-gantari leading-tight">
                  {currentMonthName}
                </span>
                <span className="text-[15px] lg:text-[17px] font-semibold text-black font-gantari leading-tight">
                  {displayYear}
                </span>
              </div>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <span className="text-[38px] lg:text-[32px] font-bold text-black leading-none tracking-tighter">
                  {selectedDate.getDate()}
                </span>
              </div>
              <div className="flex flex-col items-end min-w-[75px]">
                <span className="text-[13px] lg:text-[16px] font-semibold text-black font-gantari tracking-wide">
                  {currentDayName}
                </span>
              </div>
            </div>

            <div className="flex flex-nowrap items-center justify-center gap-2 sm:gap-4 mb-3 px-2 shrink-0">
              <button
                type="button"
                onClick={goPrevMonth}
                className="p-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-black transition-colors cursor-pointer"
                aria-label="Previous month"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div className="relative min-w-[100px]" ref={monthDropdownRef}>
                <button
                  type="button"
                  onClick={() => setMonthDropdownOpen((o: boolean) => !o)}
                  className="flex items-center justify-between gap-1 w-full rounded-md py-2 pl-0 pr-6 text-left text-[13px] font-medium text-slate-800 hover:bg-slate-50 font-gantari border-none bg-transparent cursor-pointer"
                  aria-expanded={monthDropdownOpen}
                  aria-haspopup="listbox"
                  aria-label="Select month"
                >
                  {currentMonthName}
                  <svg
                    className={`w-3.5 h-3.5 text-slate-500 absolute right-0 top-1/2 -translate-y-1/2 transition-transform ${monthDropdownOpen ? "rotate-180" : ""}`}
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
                {monthDropdownOpen && (
                  <div
                    className="absolute left-0 top-full z-30 mt-2 min-w-[140px] rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 overflow-hidden"
                    role="listbox"
                  >
                    <div
                      className="overflow-y-auto custom-scrollbar overscroll-contain"
                      style={{ maxHeight: "160px" }}
                    >
                      {MONTH_NAMES.map((name, m) => {
                        const isSelected = m === displayMonth;
                        return (
                          <button
                            key={m}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setDisplayMonth(m);
                              setMonthDropdownOpen(false);
                            }}
                            className={`block w-full px-4 py-2.5 text-left text-[13px] font-medium font-gantari transition-colors truncate cursor-pointer ${isSelected ? "bg-[#2563eb] text-white" : "text-slate-800 hover:bg-slate-100"}`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <span className="min-w-[40px] text-[13px] font-semibold text-slate-700 font-gantari">
                  {displayYear}
                </span>
                <div className="flex flex-col gap-0 -space-y-px">
                  <button
                    type="button"
                    onClick={() => setDisplayYear((y: number) => y + 1)}
                    className="py-0 px-0.5 flex items-center justify-center text-slate-700 hover:bg-slate-50 rounded-sm leading-none cursor-pointer"
                    aria-label="Next year"
                  >
                    <svg
                      className="w-2.5 h-2.5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M7 14l5-5 5 5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayYear((y: number) => y - 1)}
                    className="py-0 px-0.5 flex items-center justify-center text-slate-700 hover:bg-slate-50 rounded-sm leading-none cursor-pointer"
                    aria-label="Previous year"
                  >
                    <svg
                      className="w-2.5 h-2.5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={goNextMonth}
                className="p-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-black transition-colors"
                aria-label="Next month"
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar pl-2 pr-2">
              {isCalendarExpanded && (
                <div className="mb-2 py-2 animate-in fade-in duration-200">
                  <div className="grid grid-cols-7 gap-0 text-center text-[12px] lg:text-[13px] font-bold text-black font-gantari mb-2 [&>div]:py-0.5">
                    <div>S</div>
                    <div>M</div>
                    <div>T</div>
                    <div>W</div>
                    <div>T</div>
                    <div>F</div>
                    <div>S</div>
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 text-center text-[13px] lg:text-[14px] font-semibold font-gantari">
                    {calendarDays.map((cell, i) => {
                      const cellDate = getCellDate(cell);
                      const isSelected = isSameDay(cellDate, selectedDate);
                      const isToday = isSameDay(cellDate, today);
                      const isOtherMonth =
                        cell.type === "prev" || cell.type === "next";
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleDateClick(cell)}
                          className={`py-1 min-w-[22px] transition-colors rounded-full cursor-pointer ${isToday ? "bg-[#DD4346] text-[#FFFFFF]" : isSelected ? "text-[#E00100] font-bold" : isOtherMonth ? "text-[#9CA3AF]" : "text-black hover:bg-slate-50"}`}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-center mt-0 mb-2">
                <button
                  onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                  className="text-slate-500 hover:text-slate-700 transition-colors p-0.5"
                  aria-label={
                    isCalendarExpanded ? "Collapse calendar" : "Expand calendar"
                  }
                >
                  <svg
                    className={`w-5 h-4 transform transition-transform ${!isCalendarExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 pr-1">
                {celebrations.length === 0 ? (
                  <p className="text-sm text-slate-400 font-gantari py-4 text-center">
                    No celebrations for this date.
                  </p>
                ) : (
                  celebrations.map((event: CelebrationEvent, i: number) => (
                    <div
                      key={i}
                      className="bg-[#F8F9FA] p-5 rounded-xl border border-transparent hover:border-slate-200 transition-all flex flex-col relative"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-[#353535] text-[17px] font-gantari">
                          {event.full_name || event.project_name || "Employee"}
                        </h4>
                        <span
                          className={`text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-widest leading-none font-gantari ${event.type === "birthday"
                            ? "bg-[#FFF3E0] text-[#E65100]"
                            : event.type === "work_anniversary"
                              ? "bg-[#E7F6EA] text-[#2D8A39]"
                              : "bg-[#E3F2FD] text-[#1565C0]"
                            }`}
                        >
                          {event.type === "birthday"
                            ? "BIRTHDAY"
                            : event.type === "work_anniversary"
                              ? "CELEBRATIONS"
                              : "PROJECT DUE"}
                        </span>
                      </div>
                      {event.type === "birthday" && (
                        <>
                          <p className="text-[15px] font-semibold text-slate-700 mb-1 font-gantari">
                            Happy Birthday 🎂
                          </p>
                          <p className="text-sm text-slate-400 leading-relaxed font-gantari">
                            Wishing you a wonderful birthday! May this year
                            bring you happiness and success.
                          </p>
                        </>
                      )}
                      {event.type === "work_anniversary" && (
                        <>
                          <p className="text-[15px] font-semibold text-slate-700 mb-1 font-gantari">
                            Congratulations
                          </p>
                          <p className="text-sm text-slate-400 leading-relaxed font-gantari">
                            {event.working_years === 1
                              ? "Congratulations for your first anniversary! Marking a great year of excellence."
                              : `You have completed ${event.working_years} years in our company. Marking another year of excellence.`}
                          </p>
                        </>
                      )}
                      {event.type === "project_due" && (
                        <>
                          <p className="text-[15px] font-semibold text-slate-700 mb-1 font-gantari">
                            Project Due
                          </p>
                          <p className="text-sm text-slate-400 leading-relaxed font-gantari">
                            Project "{event.project_name}" is due on{" "}
                            {event.due_date}.
                          </p>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
