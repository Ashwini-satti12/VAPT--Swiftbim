import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { getGlobalProfileUrl } from '../../lib/profileHelpers';

const MONTH_NAMES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) =>
    new Date(2000, m, 1).toLocaleString('default', { month: 'long' })
);

type DashboardStats = {
    active_opportunities: number;
    bids_submitted: number;
    proposals_awaiting: number;
    total_projects: number;
    completed_projects: number;
    in_progress_tasks: number;
    completed_tasks: number;
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

type CelebrationEvent = {
    type: 'birthday' | 'work_anniversary' | 'project_due';
    full_name?: string;
    image?: string | null;
    working_years?: number;
    project_name?: string;
    due_date?: string;
};

type Project = {
    id: number;
    project_name: string;
    client_name: string | null;
    budget: number | string | null;
    progress: number | string | null;
    status: string;
    due_date: string | null;
};

const defaultStats: DashboardStats = {
    active_opportunities: 0,
    bids_submitted: 0,
    proposals_awaiting: 0,
    total_projects: 0,
    completed_projects: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
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

function parseTaskDateTime(dateStr: string, timeStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const t = (timeStr || '').trim();
    if (!t) return null;
    const normalized = t.length === 5 ? t + ':00' : t;
    const date = new Date(dateStr + 'T' + normalized);
    return isNaN(date.getTime()) ? null : date;
}

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

export default function DashboardV() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>(defaultStats);
    const [priorityTasks, setPriorityTasks] = useState<PriorityTask[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    // GET stats
    useEffect(() => {
        api.get<any>('/api/vendors/dashboard/stats')
            .then(({ data }) => setStats(prev => ({
                ...prev,
                active_opportunities: Number(data?.active_opportunities) || 0,
                bids_submitted: Number(data?.bids_submitted) || 0,
                proposals_awaiting: Number(data?.proposals_awaiting) || 0,
            })))
            .catch(() => { })
            .finally(() => setLoading(false));

        api.get<any>('/api/vendors/dashboard/project-stats')
            .then(({ data }) => setStats(prev => ({
                ...prev,
                total_projects: Number(data?.totalProjects) || 0,
                completed_projects: Number(data?.completedProjects) || 0,
                in_progress_tasks: Number(data?.inProgressTasks) || 0,
                completed_tasks: Number(data?.completedTasks) || 0,
            })))
            .catch(() => { });
    }, []);

    // GET data
    useEffect(() => {
        api.get<{ tasks: PriorityTask[] }>('/api/vendors/dashboard/priority-tasks')
            .then(({ data }) => setPriorityTasks(Array.isArray(data.tasks) ? data.tasks : []))
            .catch(() => setPriorityTasks([]));

        api.get<{ projects?: Project[] }>('/api/vendors/vendor-projects')
            .then(({ data }) => setProjects(Array.isArray(data.projects) ? data.projects : []))
            .catch(() => setProjects([]));
    }, []);

    const [celebrations, setCelebrations] = useState<CelebrationEvent[]>([]);
    const [celebrationsRequested, setCelebrationsRequested] = useState(false);

    const today = new Date();
    const [displayMonth, setDisplayMonth] = useState(today.getMonth());
    const [displayYear, setDisplayYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(today.getTime()));
    const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
    const monthDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCelebrations([]);
        setCelebrationsRequested(false);
    }, [selectedDate]);

    useEffect(() => {
        if (!celebrationsRequested) return;
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        api.get<{ events: CelebrationEvent[] }>('/api/calendar/events', { params: { selectedDate: dateStr } })
            .then(({ data }) => setCelebrations(Array.isArray(data.events) ? data.events : []))
            .catch(() => setCelebrations([]));
    }, [selectedDate, celebrationsRequested]);

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

    const calendarDays: { day: number; type: 'prev' | 'current' | 'next' }[] = [];
    const dim = getDaysInMonth(displayYear, displayMonth);
    const fdi = getFirstDayOfMonth(displayYear, displayMonth);
    const pmd = getDaysInMonth(displayMonth === 0 ? displayYear - 1 : displayYear, displayMonth === 0 ? 11 : displayMonth - 1);

    for (let i = fdi - 1; i >= 0; i--) calendarDays.push({ day: pmd - i, type: 'prev' });
    for (let i = 1; i <= dim; i++) calendarDays.push({ day: i, type: 'current' });
    const rem = 7 - (calendarDays.length % 7);
    if (rem < 7) for (let i = 1; i <= rem; i++) calendarDays.push({ day: i, type: 'next' });

    const getCellDate = (cell: { day: number; type: 'prev' | 'current' | 'next' }): Date => {
        if (cell.type === 'current') return new Date(displayYear, displayMonth, cell.day);
        if (cell.type === 'prev') {
            const pm = displayMonth === 0 ? 11 : displayMonth - 1;
            const py = displayMonth === 0 ? displayYear - 1 : displayYear;
            return new Date(py, pm, cell.day);
        }
        const nm = displayMonth === 11 ? 0 : displayMonth + 1;
        const ny = displayMonth === 11 ? displayYear + 1 : displayYear;
        return new Date(ny, nm, cell.day);
    };

    const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const goPrevMonth = () => {
        if (displayMonth === 0) { setDisplayYear(y => y - 1); setDisplayMonth(11); }
        else setDisplayMonth(m => m - 1);
    };
    const goNextMonth = () => {
        if (displayMonth === 11) { setDisplayYear(y => y + 1); setDisplayMonth(0); }
        else setDisplayMonth(m => m + 1);
    };

    const handleDateClick = (cell: { day: number; type: 'prev' | 'current' | 'next' }) => {
        const d = getCellDate(cell);
        setSelectedDate(d);
        setDisplayMonth(d.getMonth());
        setDisplayYear(d.getFullYear());
    };

    const kpiCards = [
        { label: 'Active Opportunities', value: stats.active_opportunities, to: '/v/opportunities?tab=opportunities&oppStatus=active' },
        { label: 'Total Bids Submitted', value: stats.bids_submitted, to: '/v/opportunities?tab=my-bids' },
        { label: 'Proposals Awaiting', value: stats.proposals_awaiting, to: '/v/opportunities?tab=my-bids&bidStatus=shortlisted' },
        { label: 'Total Projects', value: Math.max(stats.total_projects, projects.length), to: '/v/projects' },
        { label: 'Completed Projects', value: stats.completed_projects, to: '/v/projects?status=completed' },
        { label: 'In Progress Tasks', value: stats.in_progress_tasks, to: '/v/teamtasks?status=in_progress' },
        { label: 'Completed Tasks', value: stats.completed_tasks, to: '/v/teamtasks?status=completed' },
    ];

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;
    }

    return (
        <div className="flex flex-col h-screen bg-[#FDFDFD] overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Header and KPI Cards */}
                <div className="bg-white pb-6 shrink-0">
                    <h1 className="text-[24px] font-medium font-gantari text-[#000000] mb-6">Dashboard</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {kpiCards.map((card, i) => (
                            <Link
                                key={i}
                                to={card.to}
                                className="bg-[#FFFFFF] group hover:bg-[#DD4342] rounded-md border border-[#AEACAC52] px-4 py-6 shadow-sm flex items-center justify-between transition-colors cursor-pointer"
                            >
                                <h3 className="text-[17px] text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari">{card.label}</h3>
                                <p className="text-[19px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">{card.value}</p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Today's Priority */}
                    <div className="lg:col-span-2 flex flex-col bg-white rounded-md border border-[#AEACAC52] shadow-sm pt-5 pl-5 pb-5 pr-4 h-[520px]">
                        <div className="mb-6 shrink-0 px-2">
                            <h2 className="text-[20px] font-medium text-[#353535] font-gantari">Today's Priority</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                            {projects.length === 0 && priorityTasks.length === 0 ? (
                                <p className="text-[#717171] text-lg font-gantari py-6 text-center">No projects or priority tasks for today.</p>
                            ) : (
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-3 px-2">
                                        <h3 className="text-[14px] font-normal text-[#353535] font-gantari">Projects</h3>
                                        <Link to="/v/projects" className="text-[14px] font-normal text-[#DE3D3A] hover:underline font-gantari">View all</Link>
                                    </div>

                                    {priorityTasks.length > 0 ? (() => {
                                        const byProject = new Map<number, { projectName: string; tasks: PriorityTask[] }>();
                                        for (const task of priorityTasks) {
                                            const pid = task.projectid ?? 0;
                                            const name = task.project_name || `Project #${pid}`;
                                            if (!byProject.has(pid)) byProject.set(pid, { projectName: name, tasks: [] });
                                            byProject.get(pid)!.tasks.push(task);
                                        }
                                        return Array.from(byProject.entries()).slice(0, 1).map(([id, { projectName, tasks: pTasks }]) => (
                                            <div key={id} className="px-2">
                                                <p className="text-[16px] font-bold text-[#353535] font-gantari mb-3 truncate pr-2">
                                                    <Link to="/v/projects" className="hover:text-[#DE3D3A] hover:underline font-gantari">{projectName}</Link>
                                                </p>
                                                <div className="space-y-4">
                                                    {pTasks.slice(0, 1).map((task) => {
                                                        const { progress, countdown } = taskProgressAndCountdown(task.due_date, task.perferstart_time, task.perferend_time, nowMs);
                                                        const dateL = formatDateOnly(task.due_date);
                                                        const hs = (task.perferstart_time || '').trim().length > 0;
                                                        const he = (task.perferend_time || '').trim().length > 0;
                                                        const sT = hs ? formatTimeStringToAMPM(task.perferstart_time) : '—';
                                                        const eT = he ? formatTimeStringToAMPM(task.perferend_time) : '—';
                                                        const tR = hs || he ? `${sT} — ${eT}` : '—';
                                                        return (
                                                            <div key={task.id} className="flex items-center gap-4 p-4 bg-[#F8F8F8] rounded-md border border-[#AEACAC52] shadow-sm relative">
                                                                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                                                                    <svg className="w-full h-full -rotate-90">
                                                                        <circle cx="32" cy="32" r="28" stroke="#F1F5F9" strokeWidth="2" fill="#FFFFFF" />
                                                                        <circle cx="32" cy="32" r="28" stroke="#00882E" strokeWidth="2" fill="transparent" strokeDasharray={176} strokeDashoffset={176 * (1 - progress / 100)} strokeLinecap="round" />
                                                                    </svg>
                                                                    <span className="absolute text-[10px] font-bold text-black font-mono tracking-tighter">{countdown}</span>
                                                                </div>
                                                                <div className="flex-1 min-w-0 pl-4">
                                                                    <h3 className="text-[18px] font-bold text-black truncate mb-0.5 leading-none">{task.task_name ?? 'Task'}</h3>
                                                                    <p className="text-[13px] text-[#6B7280] font-medium leading-tight">{dateL} — {tR}</p>
                                                                </div>
                                                                <div className="absolute top-4 right-4">
                                                                    <span className="bg-[#3B82F6] text-white text-[11px] px-3 py-1 rounded-md font-medium font-gantari tracking-tight leading-none uppercase">{task.category || 'task'}</span>
                                                                </div>
                                                                <div className="absolute bottom-4 right-4 flex -space-x-3">
                                                                    {(task.involved_persons || []).slice(0, 3).map((v) => (
                                                                        <div key={v.id} className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-sm flex items-center justify-center overflow-hidden" title={v.full_name}>
                                                                            {v.profile_picture ? <img src={getGlobalProfileUrl(v.id, v.profile_picture, "vendor")} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#E5E5E5] flex items-center justify-center text-[10px] font-bold text-[#353535]">{v.full_name?.slice(0, 2).toUpperCase() || '?'}</div>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ));
                                    })() : projects.length > 0 && (
                                        <div className="px-2">
                                            {projects.slice(0, 1).map((p) => (
                                                <Link key={p.id} to="/v/projects" className="bg-[#F8F9FA] p-4 rounded-xl border border-[#AEACAC52] transition-all group relative block">
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-bold text-[#353535] text-[18px] font-gantari truncate pr-2 group-hover:text-[#DE3D3A]">{p.project_name}</h4>
                                                            <span className={`text-[11px] px-3 py-1 rounded-md font-bold uppercase tracking-widest ${p.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-[#E3F2FD] text-[#1565C0]'}`}>{p.status === 'Completed' ? 'COMPLETED' : 'ACTIVE'}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[13px] text-[#717171] font-semibold">
                                                            <span>Client: {p.client_name || 'N/A'}</span>
                                                            <span>Due: {formatDateOnly(p.due_date)}</span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="w-full bg-[#E5E7EB] h-3 rounded-full overflow-hidden">
                                                                <div className="bg-[#DE3D3A] h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${p.progress || 0}%` }} />
                                                            </div>
                                                            <div className="flex justify-end"><span className="text-[14px] font-bold text-[#353535]">{p.progress || 0}%</span></div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Calendar & Celebrations */}
                    <div className="lg:col-span-1 flex flex-col h-[520px]">
                        <div className="bg-white rounded-md border border-[#AEACAC52] pt-4 pl-4 pb-4 pr-0 shadow-sm flex flex-col h-full min-h-0">
                            {/* Calendar Header — exact match: left = Month/Year stacked; center = large day; right = full day name */}
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0 pt-2 px-4">
                                <div className="flex flex-col items-start min-w-[70px]">
                                    <span className="text-[15px] lg:text-[17px] font-semibold text-black font-Gantari leading-tight">{currentMonthName}</span>
                                    <span className="text-[15px] lg:text-[17px] font-semibold text-black font-Gantari leading-tight">{displayYear}</span>
                                </div>
                                <div className="flex flex-col items-center flex-1 min-w-0">
                                    <span className="text-[32px] lg:text-[38px] font-bold text-black leading-none tracking-tighter">{selectedDate.getDate()}</span>
                                </div>
                                <div className="flex flex-col items-end min-w-[75px]">
                                    <span className="text-[14px] lg:text-[16px] font-semibold text-black font-Gantari tracking-wide pr-2">{currentDayName}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 px-2 shrink-0 pr-10">
                                <button type="button" onClick={goPrevMonth} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-black transition-colors" aria-label="Previous month">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <div className="relative min-w-[100px]" ref={monthDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setMonthDropdownOpen((o) => !o)}
                                        className="flex items-center justify-between gap-1 w-full rounded-md py-2 pl-0 pr-6 text-left text-[13px] font-medium text-slate-800 hover:bg-slate-50 font-Gantari border-none bg-transparent cursor-pointer"
                                        aria-expanded={monthDropdownOpen}
                                    >
                                        {currentMonthName}
                                        <svg className={`w-3.5 h-3.5 text-slate-500 absolute right-0 top-1/2 -translate-y-1/2 transition-transform ${monthDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    {monthDropdownOpen && (
                                        <div className="absolute left-0 top-full z-30 mt-2 min-w-[140px] rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 overflow-hidden">
                                            <div className="overflow-y-auto custom-scrollbar overscroll-contain" style={{ maxHeight: '160px' }}>
                                                {MONTH_NAMES.map((name, m) => {
                                                    const isSelected = m === displayMonth;
                                                    return (
                                                        <button
                                                            key={m}
                                                            type="button"
                                                            onClick={() => {
                                                                setDisplayMonth(m);
                                                                setMonthDropdownOpen(false);
                                                            }}
                                                            className={`block w-full px-4 py-2.5 text-left text-[13px] font-medium font-Gantari transition-colors truncate cursor-pointer ${isSelected ? 'bg-[#2563eb] text-white' : 'text-slate-800 hover:bg-slate-100'}`}
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
                                    <span className="min-w-[40px] text-[13px] font-semibold text-slate-700 font-Gantari">{displayYear}</span>
                                    <div className="flex flex-col gap-0 -space-y-px">
                                        <button type="button" onClick={() => setDisplayYear((y) => y + 1)} className="py-0 px-0.5 flex items-center justify-center text-slate-700 hover:bg-slate-50 rounded-sm leading-none cursor-pointer" aria-label="Next year">
                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z" /></svg>
                                        </button>
                                        <button type="button" onClick={() => setDisplayYear((y) => y - 1)} className="py-0 px-0.5 flex items-center justify-center text-slate-700 hover:bg-slate-50 rounded-sm leading-none cursor-pointer" aria-label="Previous year">
                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z" /></svg>
                                        </button>
                                    </div>
                                </div>
                                <button type="button" onClick={goNextMonth} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-black transition-colors" aria-label="Next month">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                {isCalendarExpanded && (
                                    <div className="mb-2 py-2 animate-in fade-in duration-200">
                                        <div className="grid grid-cols-7 gap-0 text-center text-[12px] lg:text-[13px] font-bold text-black font-Gantari mb-2 [&>div]:py-0.5">
                                            <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                                        </div>
                                        <div className="grid grid-cols-7 gap-y-1 text-center text-[13px] lg:text-[14px] font-semibold font-Gantari px-1">
                                            {calendarDays.map((c, i) => {
                                                const d = getCellDate(c);
                                                const isSel = isSameDay(d, selectedDate);
                                                const isTd = isSameDay(d, today);
                                                const isEx = c.type !== 'current';
                                                return (
                                                    <button key={i} type="button" onClick={() => handleDateClick(c)} className={`py-1.5 min-w-[24px] transition-all rounded-full cursor-pointer flex items-center justify-center ${isTd ? 'bg-[#DD4346] text-white' : isSel ? 'text-[#E00100] font-bold ring-1 ring-[#DE3D3A]/20' : isEx ? 'text-[#9CA3AF]' : 'text-black hover:bg-slate-50'}`}>
                                                        {c.day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-center mb-6">
                                    <button type="button" onClick={() => { setCelebrationsRequested(true); setIsCalendarExpanded(!isCalendarExpanded); }} className="text-slate-400 hover:text-[#DE3D3A] transition-colors cursor-pointer p-1"><svg className={`w-6 h-6 transition-transform ${isCalendarExpanded ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
                                </div>

                                <div className="space-y-5">
                                    {!celebrationsRequested ? <p className="text-[14px] text-slate-400 font-gantari text-center py-4">Click arrow to load celebrations.</p> : celebrations.length === 0 ? <p className="text-[14px] text-slate-400 font-gantari text-center py-4">No celebrations.</p> : celebrations.map((e, i) => (
                                        <div key={i} className="bg-[#F8F9FA] p-6 rounded-xl border border-transparent hover:border-slate-200 transition-all">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-bold text-[#353535] text-[17px] font-gantari">{e.full_name || e.project_name}</h4>
                                                <span className={`text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider ${e.type === 'birthday' ? 'bg-[#FFF3E0] text-[#E65100]' : e.type === 'work_anniversary' ? 'bg-[#E7F6EA] text-[#2D8A39]' : 'bg-[#E3F2FD] text-[#1565C0]'}`}>{e.type === 'birthday' ? 'BIRTHDAY' : e.type === 'work_anniversary' ? 'CELEBRATION' : 'DUE'}</span>
                                            </div>
                                            {e.type === 'birthday' && <p className="text-[14px] text-slate-500 font-gantari">Happy Birthday! 🎂</p>}
                                            {e.type === 'work_anniversary' && <p className="text-[14px] text-slate-500 font-gantari">Completed {e.working_years} {e.working_years === 1 ? 'year' : 'years'}!</p>}
                                            {e.type === 'project_due' && <p className="text-[14px] text-slate-500 font-gantari">Project due on {e.due_date}.</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
