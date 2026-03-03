import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';

const MONTH_NAMES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) =>
    new Date(2000, m, 1).toLocaleString('default', { month: 'long' })
);

type DashboardStats = {
    totalProjects: number;
    completedProjects: number;
    inProgressTasks: number;
    completedTasks: number;
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
    involved_persons: InvolvedPerson[];
};

const defaultStats: DashboardStats = {
    totalProjects: 0,
    completedProjects: 0,
    inProgressTasks: 0,
    completedTasks: 0,
};

function formatDateOnly(isoOrDate: string | null | undefined): string {
    if (!isoOrDate) return '—';
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/** Parse due_date (YYYY-MM-DD) + time (HH:MM:SS or HH:MM) to Date. Returns null if timeStr is missing. */
function parseTaskDateTime(dateStr: string, timeStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const t = (timeStr || '').trim();
    if (!t) return null;
    const normalized = t.length === 5 ? t + ':00' : t;
    const date = new Date(dateStr + 'T' + normalized);
    return isNaN(date.getTime()) ? null : date;
}

/** Format a time-only string (HH:MM:SS or HH:MM) to "h:mm AM/PM" in local display. */
function formatTimeStringToAMPM(timeStr: string | null | undefined): string {
    if (!timeStr || !timeStr.trim()) return '—';
    const t = timeStr.trim();
    const parts = t.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
    if (isNaN(h)) return '—';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Progress 0–100 from now between start and end; countdown string (hh:mm:ss) to end. */
function taskProgressAndCountdown(
    dueDate: string,
    startTime: string | null | undefined,
    endTime: string | null | undefined,
    nowMs: number = Date.now()
): { progress: number; countdown: string } {
    const start = parseTaskDateTime(dueDate, startTime);
    const end = parseTaskDateTime(dueDate, endTime);
    const now = nowMs;
    if (!start || !end || end.getTime() <= start.getTime()) {
        return { progress: 0, countdown: '—' };
    }
    const startMs = start.getTime();
    const endMs = end.getTime();
    let progress = 0;
    if (now <= startMs) progress = 0;
    else if (now >= endMs) progress = 100;
    else progress = Math.round(((now - startMs) / (endMs - startMs)) * 100);

    let countdown = '—';
    const remaining = Math.floor((endMs - now) / 1000);
    if (remaining <= 0) {
        countdown = '0:00:00';
    } else {
        const h = Math.floor(remaining / 3600);
        const m = Math.floor((remaining % 3600) / 60);
        const s = remaining % 60;
        countdown = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return { progress, countdown };
}

const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 36;

export default function DashboardTD() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>(defaultStats);
    const [priorityTasks, setPriorityTasks] = useState<PriorityTask[]>([]);
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        api.get<DashboardStats>('/api/dashboard/stats')
            .then(({ data }) => setStats({
                totalProjects: data.totalProjects ?? 0,
                completedProjects: data.completedProjects ?? 0,
                inProgressTasks: data.inProgressTasks ?? 0,
                completedTasks: data.completedTasks ?? 0,
            }))
            .catch(() => setStats(defaultStats))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        api.get<{ tasks: PriorityTask[] }>('/api/dashboard/priority-tasks')
            .then(({ data }) => setPriorityTasks(data.tasks ?? []))
            .catch(() => setPriorityTasks([]));
    }, []);

    // Calendar state — so we can change year/month and select a date (integration code can read these)
    const today = new Date();
    const [displayMonth, setDisplayMonth] = useState(today.getMonth());
    const [displayYear, setDisplayYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(today.getTime()));
    const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
    const monthDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!monthDropdownOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) {
                setMonthDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [monthDropdownOpen]);

    const currentDayName = selectedDate.toLocaleString('default', { weekday: 'long' }).toUpperCase();
    const currentMonthName = new Date(displayYear, displayMonth, 1).toLocaleString('default', { month: 'long' });

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const daysInMonth = getDaysInMonth(displayYear, displayMonth);
    const firstDay = getFirstDayOfMonth(displayYear, displayMonth);
    const prevMonthDays = getDaysInMonth(displayMonth === 0 ? displayYear - 1 : displayYear, displayMonth === 0 ? 11 : displayMonth - 1);

    const calendarDays: { day: number; type: 'prev' | 'current' | 'next' }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
        calendarDays.push({ day: prevMonthDays - i, type: 'prev' });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({ day: i, type: 'current' });
    }
    const remaining = 7 - (calendarDays.length % 7);
    if (remaining < 7) {
        for (let i = 1; i <= remaining; i++) {
            calendarDays.push({ day: i, type: 'next' });
        }
    }

    const getCellDate = (cell: { day: number; type: 'prev' | 'current' | 'next' }): Date => {
        if (cell.type === 'current') return new Date(displayYear, displayMonth, cell.day);
        if (cell.type === 'prev') {
            const prevM = displayMonth === 0 ? 11 : displayMonth - 1;
            const prevY = displayMonth === 0 ? displayYear - 1 : displayYear;
            return new Date(prevY, prevM, cell.day);
        }
        const nextM = displayMonth === 11 ? 0 : displayMonth + 1;
        const nextY = displayMonth === 11 ? displayYear + 1 : displayYear;
        return new Date(nextY, nextM, cell.day);
    };

    const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const goPrevMonth = () => {
        if (displayMonth === 0) {
            setDisplayYear((y) => y - 1);
            setDisplayMonth(11);
        } else setDisplayMonth((m) => m - 1);
    };
    const goNextMonth = () => {
        if (displayMonth === 11) {
            setDisplayYear((y) => y + 1);
            setDisplayMonth(0);
        } else setDisplayMonth((m) => m + 1);
    };

    const handleDateClick = (cell: { day: number; type: 'prev' | 'current' | 'next' }) => {
        const d = getCellDate(cell);
        setSelectedDate(d);
        setDisplayMonth(d.getMonth());
        setDisplayYear(d.getFullYear());
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:h-full lg:overflow-hidden">
            {/* Header and KPI Cards */}
            <div className="bg-white pb-6 pt-0 border-b border-transparent shrink-0">
                <h1 className="text-xl font-medium font-gantari text-slate-800 mb-6">Dashboard</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Projects - Red Card */}
                    <div className="bg-[#F2F2F2] group hover:bg-[#DE3D3A] rounded-2xl border border-[#AEACAC52] p-6 shadow-lg flex flex-col min-h-[140px] lg:h-[100px] transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xl text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari leading-tight">Total<br />Projects</h3>
                            </div>
                            <p className="text-[28px] lg:text-[32px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none pt-1">{stats.totalProjects}</p>
                        </div>
                        <div className="mt-auto w-full">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[12px] text-[#353535] group-hover:text-[#F2F2F2] font-medium font-gantari whitespace-nowrap">Total Projects</p>
                                <span className="text-[12px] text-[#717171] group-hover:text-[#F2F2F2] font-bold">{stats.totalProjects ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-white rounded-full flex items-center px-1 overflow-hidden">
                                <div className="h-1 bg-[#DE3D3A] rounded-full" style={{ width: stats.totalProjects ? `${Math.min(100, (stats.completedProjects / stats.totalProjects) * 100)}%` : '0%' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Completed Projects */}
                    <div className="bg-[#F2F2F2] group hover:bg-[#DE3D3A] border border-[#AEACAC52] rounded-2xl p-6 shadow-sm flex flex-col min-h-[140px] lg:h-[100px] transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xl text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari leading-tight">Completed<br />Projects</h3>
                            </div>
                            <div className="flex flex-col items-end">
                                <p className="text-[28px] lg:text-[32px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">{stats.completedProjects}</p>
                            </div>
                        </div>
                        <div className="mt-auto w-full">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[12px] text-[#353535] group-hover:text-[#F2F2F2] font-medium font-gantari whitespace-nowrap">Total Completed Projects</p>
                                <span className="text-[12px] text-[#717171] group-hover:text-[#F2F2F2] font-bold">{stats.totalProjects ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-white rounded-full flex items-center px-1 overflow-hidden">
                                <div className="h-1 bg-[#00882E] rounded-full" style={{ width: stats.totalProjects ? `${Math.min(100, (stats.completedProjects / stats.totalProjects) * 100)}%` : '0%' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* In-Progress Tasks */}
                    <div className="bg-[#F2F2F2] group hover:bg-[#DE3D3A] border border-[#AEACAC52] rounded-2xl p-6 shadow-sm flex flex-col min-h-[140px] lg:h-[100px] transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xl text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari leading-tight">In-Progress<br />Task</h3>
                            </div>
                            <div className="flex flex-col items-end">
                                <p className="text-[28px] lg:text-[32px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">{stats.inProgressTasks}</p>
                            </div>
                        </div>
                        <div className="mt-auto w-full">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[12px] text-[#353535] group-hover:text-[#F2F2F2] font-medium font-gantari whitespace-nowrap">Total In-Progress Task</p>
                                <span className="text-[12px] text-[#717171] group-hover:text-[#F2F2F2] font-bold">{stats.completedTasks + stats.inProgressTasks ? Math.round((stats.inProgressTasks / (stats.completedTasks + stats.inProgressTasks)) * 100) : 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-white rounded-full flex items-center px-1 overflow-hidden">
                                <div className="h-1 bg-[#E47E00] rounded-full" style={{ width: stats.completedTasks + stats.inProgressTasks ? `${Math.min(100, (stats.inProgressTasks / (stats.completedTasks + stats.inProgressTasks)) * 100)}%` : '0%' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Completed Tasks */}
                    <div className="bg-[#F2F2F2] group hover:bg-[#DE3D3A] border border-[#AEACAC52] rounded-2xl p-6 shadow-sm flex flex-col min-h-[140px] lg:h-[100px] transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xl text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari leading-tight">Completed<br />Task</h3>
                            </div>
                            <div className="flex flex-col items-end">
                                <p className="text-[28px] lg:text-[32px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">{stats.completedTasks}</p>
                            </div>
                        </div>
                        <div className="mt-auto w-full">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[12px] text-[#353535] group-hover:text-[#F2F2F2] font-medium font-gantari whitespace-nowrap">Total Completed Task</p>
                                <span className="text-[12px] text-[#717171] group-hover:text-[#F2F2F2] font-bold">{stats.completedTasks + stats.inProgressTasks ? Math.round((stats.completedTasks / (stats.completedTasks + stats.inProgressTasks)) * 100) : 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-white rounded-full flex items-center px-1 overflow-hidden">
                                <div className="h-1 bg-[#00882E] rounded-full" style={{ width: stats.completedTasks + stats.inProgressTasks ? `${Math.min(100, (stats.completedTasks / (stats.completedTasks + stats.inProgressTasks)) * 100)}%` : '0%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-4 overflow-visible lg:overflow-hidden">
                {/* Today's Priority */}
                <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-[#AEACAC52] shadow-sm pt-4 pl-4 pb-4 pr-0 h-[500px] lg:h-full overflow-hidden">
                    <h2 className="text-xl font-semibold text-[#353535] font-gantari mb-6 ">Today's Priority</h2>

                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4 ">
                        {priorityTasks.length === 0 ? (
                            <p className="text-[#717171] text-sm font-gantari py-4">No priority tasks for today.</p>
                        ) : (
                            priorityTasks.map((task) => {
                                const { progress, countdown } = taskProgressAndCountdown(
                                    task.due_date,
                                    task.perferstart_time,
                                    task.perferend_time,
                                    nowMs
                                );
                                const strokeOffset = CIRCLE_CIRCUMFERENCE * (1 - progress / 100);
                                const dateLabel = formatDateOnly(task.due_date);
                                const hasStart = (task.perferstart_time || '').trim().length > 0;
                                const hasEnd = (task.perferend_time || '').trim().length > 0;
                                const startLabel = hasStart ? formatTimeStringToAMPM(task.perferstart_time) : '—';
                                const endLabel = hasEnd ? formatTimeStringToAMPM(task.perferend_time) : '—';
                                const timeRangeLabel = hasStart || hasEnd ? `${startLabel} — ${endLabel}` : '—';
                                return (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-5 p-5 bg-[#F2F2F2] rounded-xl border border-transparent hover:border-slate-200 transition-all group shrink-0 relative"
                                    >
                                        {/* Circular progress / timer */}
                                        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                                            <svg className="w-full h-full -rotate-90">
                                                <circle
                                                    cx="40"
                                                    cy="40"
                                                    r="36"
                                                    stroke="#E5E7EB"
                                                    strokeWidth="5"
                                                    fill="transparent"
                                                    className="opacity-40"
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
                                            <span className="absolute text-[10px] font-bold text-black font-mono">{countdown}</span>
                                        </div>

                                        {/* Task Info */}
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="mb-2">
                                                <h3 className="text-xl font-bold text-[#353535] truncate mb-0.5">{task.task_name}</h3>
                                                <p className="text-[14px] text-[#353535] font-medium leading-tight">
                                                    {dateLabel}  {timeRangeLabel}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Badge (Top Right) */}
                                        <div className="absolute top-4 right-4">
                                            <span className="bg-[#DBE9FE] text-[#101827] text-[12px] px-3.5 py-1 rounded-md font-medium font-gantari tracking-tight">
                                                {task.category || 'Task'}
                                            </span>
                                        </div>

                                        {/* Involved persons (avatars) */}
                                        <div className="absolute bottom-4 right-4 flex -space-x-4">
                                            {(task.involved_persons?.length ? task.involved_persons : []).slice(0, 3).map((person) => (
                                                <div
                                                    key={person.id}
                                                    className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-sm flex items-center justify-center overflow-hidden"
                                                    title={person.full_name}
                                                >
                                                    {person.profile_picture ? (
                                                        <img src={person.profile_picture} alt="" className="w-full h-full object-cover" />
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
                            })
                        )}
                    </div>
                </div>

                {/* Calendar & Celebrations */}
                <div className="lg:col-span-1 flex flex-col h-[600px] lg:h-full overflow-hidden">
                    <div className="bg-white rounded-2xl border border-[#AEACAC52] pl-4 pb-4 pr-0 shadow-sm flex flex-col h-full min-h-0">
                        {/* Calendar Header — exact match: left = "December" then "2026" stacked; center = large day; right = "SUNDAY" */}
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

                        {/* Month & Year — single line: [ < ] [ Month ▼ ] [ ↑ Year ↓ ] [ > ] */}
                        <div className="flex flex-nowrap items-center justify-center gap-2 sm:gap-4 mb-3 px-2 shrink-0">
                            <button type="button" onClick={goPrevMonth} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-black transition-colors" aria-label="Previous month">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="relative min-w-[100px]" ref={monthDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setMonthDropdownOpen((o) => !o)}
                                    className="flex items-center justify-between gap-1 w-full rounded-md py-2 pl-0 pr-6 text-left text-[13px] font-medium text-slate-800 hover:bg-slate-50 font-gantari border-none bg-transparent"
                                    aria-expanded={monthDropdownOpen}
                                    aria-haspopup="listbox"
                                    aria-label="Select month"
                                >
                                    {currentMonthName}
                                    <svg className={`w-3.5 h-3.5 text-slate-500 absolute right-0 top-1/2 -translate-y-1/2 transition-transform ${monthDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {monthDropdownOpen && (
                                    <div
                                        className="absolute left-0 top-full z-30 mt-2 min-w-[140px] rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 overflow-hidden"
                                        role="listbox"
                                    >
                                        <div className="overflow-y-auto custom-scrollbar overscroll-contain" style={{ maxHeight: '160px' }}>
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
                                                        className={`block w-full px-4 py-2.5 text-left text-[13px] font-medium font-gantari transition-colors truncate ${isSelected ? 'bg-[#2563eb] text-white' : 'text-slate-800 hover:bg-slate-100'}`}
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
                                    <button type="button" onClick={() => setDisplayYear((y) => y + 1)} className="py-0 px-0.5 flex items-center justify-center text-slate-700 hover:bg-slate-50 rounded-sm leading-none" aria-label="Next year">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z" /></svg>
                                    </button>
                                    <button type="button" onClick={() => setDisplayYear((y) => y - 1)} className="py-0 px-0.5 flex items-center justify-center text-slate-700 hover:bg-slate-50 rounded-sm leading-none" aria-label="Previous year">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z" /></svg>
                                    </button>
                                </div>
                            </div>
                            <button type="button" onClick={goNextMonth} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-black transition-colors" aria-label="Next month">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        {/* Scrollable area: calendar grid + toggle + celebrations (so below data is reachable) */}
                        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar pl-2 pr-2">
                            {/* Calendar Grid — match image: S M T W T F S bold black; prev/next month grey; selected date red text */}
                            {isCalendarExpanded && (
                                <div className="mb-2 py-2 animate-in fade-in duration-200">
                                    <div className="grid grid-cols-7 gap-0 text-center text-[12px] lg:text-[13px] font-bold text-black font-gantari mb-2 [&>div]:py-0.5">
                                        <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                                    </div>
                                    <div className="grid grid-cols-7 gap-y-1 text-center text-[13px] lg:text-[14px] font-semibold font-gantari">
                                        {calendarDays.map((cell, i) => {
                                            const cellDate = getCellDate(cell);
                                            const isSelected = isSameDay(cellDate, selectedDate);
                                            const isOtherMonth = cell.type === 'prev' || cell.type === 'next';
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => handleDateClick(cell)}
                                                    className={`py-1 min-w-[22px] transition-colors ${isSelected ? 'text-[#E00100] font-bold' : isOtherMonth ? 'text-[#9CA3AF]' : 'text-black hover:bg-slate-50'}`}
                                                >
                                                    {cell.day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Upward caret — bottom center (scroll / collapse) */}
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

                            {/* Celebrations Section — below calendar, inside scroll */}
                            <div className="space-y-4 pr-1">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="bg-[#F8F9FA] p-5 rounded-xl border border-transparent hover:border-slate-200 transition-all flex flex-col relative">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold text-[#353535] text-[17px] font-gantari">Malfoe</h4>
                                            <span className="bg-[#E7F6EA] text-[#2D8A39] text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-widest leading-none font-gantari">
                                                CELEBRATIONS
                                            </span>
                                        </div>
                                        <p className="text-[15px] font-semibold text-slate-700 mb-1 font-gantari">Congratulations</p>
                                        <p className="text-sm text-slate-400 leading-relaxed font-gantari">
                                            You have completed 2 years in our company. Marking another year of excellence.
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
