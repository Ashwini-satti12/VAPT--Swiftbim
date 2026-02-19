import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import type { DashboardStats } from '../../types';

interface PriorityTask {
  id: number;
  task_name?: string;
  due_date?: string;
  status?: string;
  category?: string;
  project_name?: string;
}

interface DashboardEvent {
  id?: number;
  title?: string;
  details?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
}

interface Announcement {
  id?: number;
  title?: string;
  content?: string;
  date?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [priorityTasks, setPriorityTasks] = useState<PriorityTask[]>([]);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/api/dashboard/stats'),
      api.get<{ tasks: PriorityTask[] }>('/api/dashboard/priority-tasks'),
      api.get<{ events: DashboardEvent[] }>('/api/dashboard/events'),
    ])
      .then(([s, p, e]) => {
        setStats(s.data);
        setPriorityTasks(p.data.tasks ?? []);
        setEvents(e.data.events ?? []);
      })
      .catch(() => {
        console.error("Failed to load dashboard data");
      })
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');

  // Calendar Logic
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();
  const currentDayName = today.toLocaleString('default', { weekday: 'long' }).toUpperCase();

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, today.getMonth());
  const firstDay = getFirstDayOfMonth(currentYear, today.getMonth());

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Projects - Red Card */}
        <div className="bg-[#E44D4D] rounded-xl p-6 text-white shadow-sm relative overflow-hidden">

          <h3 className="font-medium text-lg opacity-90">Total Projects</h3>
          <p className="text-4xl font-bold mt-2">{stats?.totalProjects ?? 0}</p>
          <div className="mt-6">
            <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: '45%' }}></div>
            </div>
            <p className="text-xs mt-1 opacity-80">Total Projects</p>
          </div>
        </div>

        {/* Completed Projects */}
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-slate-600 text-lg">Completed Projects</h3>

            </div>
            <p className="text-4xl font-bold text-slate-800">{stats?.completedProjects ?? 0}</p>
          </div>
          <div className="mt-8">
            <p className="text-xs text-slate-500 mb-1">Total Completed Projects <span className="float-right text-slate-400">12%</span></p>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '12%' }}></div>
            </div>
          </div>
        </div>

        {/* In-Progress Tasks */}
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-slate-600 text-lg">In-Progress Task</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800">{stats?.inProgressTasks ?? 0}</p>
          </div>
          <div className="mt-8">
            <p className="text-xs text-slate-500 mb-1">Total In-Progress Task <span className="float-right text-slate-400">12%</span></p>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: '12%' }}></div>
            </div>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-slate-600 text-lg">Completed Task</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800">{stats?.completedTasks ?? 0}</p>
          </div>
          <div className="mt-8">
            <p className="text-xs text-slate-500 mb-1">Total Completed Task <span className="float-right text-slate-400">12%</span></p>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '12%' }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Priority */}
        <div className="lg:col-span-2 space-y-4">

          <div className="bg-white rounded-xl border border-slate-100 p-6 min-h-[400px]">
            <h2 className="text-lg font-semibold text-slate-700 mb-6">Today's Priority</h2>

            <div className="space-y-4">
              {priorityTasks.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No specific priority tasks for today.</p>
              ) : (
                priorityTasks.map((task) => (
                  <Link
                    to={`/tasks/${task.id}`}
                    key={task.id}
                    className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 hover:shadow-sm transition-shadow block"
                  >
                    {/* Circular Progress Placeholder */}
                    <div className="relative w-16 h-16 shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#e2e8f0" strokeWidth="4" fill="transparent" />
                        <circle cx="32" cy="32" r="28" stroke="#10b981" strokeWidth="4" fill="transparent" strokeDasharray="175.84" strokeDashoffset="40" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-slate-600">
                        hh:mm:ss
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <h4 className="font-medium text-slate-800 text-lg">{task.task_name}</h4>
                      <p className="text-slate-500 text-sm mt-1">{formatDate(task.due_date)} - 10:00 AM</p>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        Task
                      </span>
                      {/* Toggle visually */}
                      <div className="w-10 h-5 bg-slate-200 rounded-full relative cursor-pointer">
                        <div className="w-5 h-5 bg-white rounded-full shadow-sm absolute left-0 top-0 border border-slate-200"></div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Calendar & Celebrations */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">"{currentMonth}</h3>
                <p className="text-lg font-semibold text-slate-800">{currentYear}</p>
              </div>
              <div className="text-right">
                <h2 className="text-5xl font-bold text-slate-900">{currentDay}</h2>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{currentDayName}</p>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="mb-6">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
                <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {calendarDays.map((day, idx) => (
                  <div key={idx} className={`p-1.5 rounded-full ${day === currentDay ? 'text-red-500 font-bold' : 'text-slate-600'}`}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* Celebrations / Announcements */}
            <div className="space-y-3">
              {/* Malfoe Placeholder - Dynamic if events exist */}
              {events.length > 0 ? events.slice(0, 2).map((ev, i) => (
                <div key={i} className="bg-slate-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-800 text-sm">Event</h4>
                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">Celebrations</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-medium">{ev.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    {ev.details || 'No details provided.'}
                  </p>
                </div>
              )) : (
                <>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-sm">Malfoe</h4>
                      <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">Celebrations</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">Congratulations</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      You have completed 2 years in our company. Marking another year of excellence.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-sm">Malfoe</h4>
                      <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">Celebrations</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">Congratulations</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      You have completed 2 years in our company. Marking another year of excellence.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
