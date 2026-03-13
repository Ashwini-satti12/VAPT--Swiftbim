import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../lib/api';
import { getGlobalProfileUrl } from '../../../lib/profileHelpers';

type DashboardStats = {
    active_opportunities: number;
    bids_submitted: number;
    proposals_awaiting: number;
    active_projects: number;
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

const defaultStats: DashboardStats = {
    active_opportunities: 0,
    bids_submitted: 0,
    proposals_awaiting: 0,
    active_projects: 0,
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

export default function VendorBimLeadDashboard() {
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
        api.get<DashboardStats>('/api/vendors/dashboard/stats')
            .then(({ data }) => setStats({
                active_opportunities: Number(data?.active_opportunities) || 0,
                bids_submitted: Number(data?.bids_submitted) || 0,
                proposals_awaiting: Number(data?.proposals_awaiting) || 0,
                active_projects: Number(data?.active_projects) || 0,
            }))
            .catch(() => setStats(defaultStats))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        api.get<{ tasks: PriorityTask[] }>('/api/vendors/dashboard/priority-tasks')
            .then(({ data }) => setPriorityTasks(Array.isArray(data.tasks) ? data.tasks : []))
            .catch(() => setPriorityTasks([]));
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

    const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

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

    const kpiCards = [
        { label: 'Active Opportunities', value: stats.active_opportunities },
        { label: 'Total Bids Submitted', value: stats.bids_submitted },
        { label: 'Proposals Awaiting', value: stats.proposals_awaiting },
        { label: 'Active Projects', value: stats.active_projects },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:h-full lg:overflow-hidden">
            <div className="bg-white pb-6 pt-0 border-b border-transparent shrink-0">
                <h1 className="text-xl font-medium font-gantari text-slate-800 mb-6">BIM Lead Dashboard</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {kpiCards.map((card, i) => (
                        <div key={i} className="bg-[#F2F2F2] group hover:bg-[#DD4342] rounded-xl border border-[#AEACAC52] px-4 py-6 shadow-sm flex items-center justify-between min-h-0 transition-colors">
                            <h3 className="text-sm sm:text-base text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari">{card.label}</h3>
                            <p className="text-xl sm:text-2xl text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">{card.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-4 overflow-visible lg:overflow-hidden">
                <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-[#AEACAC52] shadow-sm pt-4 pl-4 pb-4 pr-0 h-[500px] lg:h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-4 shrink-0 pr-4">
                        <h2 className="text-xl font-semibold text-[#353535] font-gantari">Today's Priority</h2>
                    </div>
                    <div className="border-b border-[#AEACAC52] mb-4" aria-hidden />

                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                        {priorityTasks.length === 0 ? (
                            <p className="text-[#717171] text-sm font-gantari py-4 px-4">No priority tasks for today.</p>
                        ) : (
                            <div className="px-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-[#353535] font-gantari">Projects</h3>
                                    <Link to="/vendor-bim-lead/projects" className="text-sm font-medium text-[#DD4342] hover:underline font-gantari transition-colors">View all</Link>
                                </div>
                                {(() => {
                                    const byProject = new Map<number, { projectName: string; tasks: PriorityTask[] }>();
                                    for (const task of priorityTasks) {
                                        const pid = task.projectid ?? 0;
                                        const name = task.project_name || `Project #${pid}`;
                                        if (!byProject.has(pid)) byProject.set(pid, { projectName: name, tasks: [] });
                                        byProject.get(pid)!.tasks.push(task);
                                    }
                                    const projectList = Array.from(byProject.entries()).map(([id, { projectName, tasks }]) => ({ id, projectName, tasks }));
                                    return projectList.map(({ id, projectName, tasks: projectTasks }) => (
                                        <div key={id} className="mb-6">
                                            <p className="text-sm font-semibold text-[#353535] font-gantari mb-3 truncate pr-2">
                                                <Link to="/vendor-bim-lead/projects" className="hover:text-[#DD4342] hover:underline transition-colors" title={projectName}>{projectName}</Link>
                                            </p>
                                            <div className="space-y-4">
                                                {projectTasks.map((task) => {
                                                    const { progress, countdown } = taskProgressAndCountdown(task.due_date, task.perferstart_time, task.perferend_time, nowMs);
                                                    const strokeOffset = CIRCLE_CIRCUMFERENCE * (1 - progress / 100);
                                                    return (
                                                        <div key={task.id} className="flex items-center gap-5 p-5 bg-[#F8F8F8] rounded-xl border border-slate-200/80 shadow-sm relative transition-shadow hover:shadow-md">
                                                            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                                                                <svg className="w-full h-full -rotate-90">
                                                                    <circle cx="40" cy="40" r="36" stroke="#E5E7EB" strokeWidth="5" fill="transparent" className="opacity-60" />
                                                                    <circle cx="40" cy="40" r="36" stroke="#00882E" strokeWidth="5" fill="transparent" strokeDasharray={CIRCLE_CIRCUMFERENCE} strokeDashoffset={strokeOffset} strokeLinecap="round" />
                                                                </svg>
                                                                <span className="absolute text-[10px] font-bold text-black font-mono">{countdown}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-2">
                                                                <h3 className="text-xl font-bold text-black truncate mb-0.5">{task.task_name ?? 'Task'}</h3>
                                                                <p className="text-[14px] text-[#6B7280] font-medium leading-tight">{formatDateOnly(task.due_date)}</p>
                                                            </div>
                                                            <div className="absolute top-4 right-4">
                                                                <span className="bg-[#3B82F6] text-white text-[12px] px-3.5 py-1 rounded-md font-medium font-gantari tracking-tight">{task.category || 'Task'}</span>
                                                            </div>
                                                            <div className="absolute bottom-4 right-4 flex -space-x-4">
                                                                {(task.involved_persons?.slice(0, 3) || []).map((person) => (
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
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1 flex flex-col h-[600px] lg:h-full overflow-hidden">
                    <div className="bg-white rounded-2xl border border-[#AEACAC52] pl-4 pb-4 pr-0 shadow-sm flex flex-col h-full min-h-0">
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
                            <button type="button" onClick={goPrevMonth} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-black transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <span className="text-[13px] font-semibold text-slate-700 font-gantari min-w-[80px] text-center">{currentMonthName}</span>
                            <button type="button" onClick={goNextMonth} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-black transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pl-2 pr-2">
                            {isCalendarExpanded && (
                                <div className="mb-2 py-2 animate-in fade-in duration-200">
                                    <div className="grid grid-cols-7 gap-0 text-center text-[12px] lg:text-[13px] font-bold text-black font-gantari mb-2">
                                        <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                                    </div>
                                    <div className="grid grid-cols-7 gap-y-1 text-center text-[13px] lg:text-[14px] font-semibold font-gantari">
                                        {calendarDays.map((cell, i) => {
                                            const cellDate = getCellDate(cell);
                                            const isSelected = isSameDay(cellDate, selectedDate);
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => handleDateClick(cell)}
                                                    className={`py-1 min-w-[22px] transition-colors rounded-lg ${isSelected ? 'text-[#DD4342] font-bold bg-[#DD4342]/10' : cell.type === 'current' ? 'text-black hover:bg-slate-50' : 'text-[#9CA3AF]'}`}
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
                                    type="button"
                                    onClick={() => {
                                        setCelebrationsRequested(true);
                                        setIsCalendarExpanded(!isCalendarExpanded);
                                    }}
                                    className="text-slate-500 hover:text-slate-700 transition-colors p-0.5"
                                >
                                    <svg className={`w-5 h-4 transform transition-transform ${!isCalendarExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4 pr-1">
                                {!celebrationsRequested ? (
                                    <p className="text-sm text-slate-400 font-gantari py-4 text-center">Click the up arrow to load celebrations.</p>
                                ) : celebrations.length === 0 ? (
                                    <p className="text-sm text-slate-400 font-gantari py-4 text-center">No celebrations for this date.</p>
                                ) : (
                                    celebrations.map((event, i) => (
                                        <div key={i} className="bg-[#F8F9FA] p-5 rounded-xl border border-transparent hover:border-slate-200 transition-all flex flex-col relative">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold text-[#353535] text-[17px] font-gantari">{event.full_name || event.project_name || 'Employee'}</h4>
                                                <span className={`text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-widest leading-none font-gantari ${event.type === 'birthday' ? 'bg-[#FFF3E0] text-[#E65100]' : event.type === 'work_anniversary' ? 'bg-[#E7F6EA] text-[#2D8A39]' : 'bg-[#E3F2FD] text-[#1565C0]'}`}>
                                                    {event.type.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400 leading-relaxed font-gantari">
                                                {event.type === 'birthday' ? 'Happy Birthday! 🎂' : event.type === 'work_anniversary' ? `Celebrating ${event.working_years} years!` : `Project due: ${event.project_name}`}
                                            </p>
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
