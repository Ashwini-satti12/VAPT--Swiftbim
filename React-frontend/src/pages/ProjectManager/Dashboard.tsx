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
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800 mb-4 px-1">Dashboard</h1>
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects - Red Card */}
        <div className="bg-[#E44D4D] rounded-xl p-4 text-white shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[12px] font-bold opacity-90 uppercase tracking-tight">Total Projects</h3>
              <p className="text-[10px] mt-0.5 opacity-70">Total Projects</p>
            </div>
            <p className="text-4xl font-bold">115</p>
          </div>
          <div className="mt-6">
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: '45%' }}></div>
            </div>
          </div>
        </div>

        {/* Completed Projects */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-tight">Completed Projects</h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Total Completed Projects</p>
            </div>
            <p className="text-3xl font-bold text-slate-800">24</p>
          </div>
          <div className="mt-6">
            <div className="flex justify-between items-end mb-1">
              <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden mr-2">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '12%' }}></div>
              </div>
              <span className="text-[9px] font-bold text-slate-400">12%</span>
            </div>
          </div>
        </div>

        {/* In-Progress Tasks */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-tight">In-Progress Task</h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Total In-Progress Task</p>
            </div>
            <p className="text-3xl font-bold text-slate-800">24</p>
          </div>
          <div className="mt-6">
            <div className="flex justify-between items-end mb-1">
              <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden mr-2">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: '12%' }}></div>
              </div>
              <span className="text-[9px] font-bold text-slate-400">12%</span>
            </div>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-tight">Completed Task</h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Total Completed Task</p>
            </div>
            <p className="text-3xl font-bold text-slate-800">24</p>
          </div>
          <div className="mt-6">
            <div className="flex justify-between items-end mb-1">
              <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden mr-2">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '12%' }}></div>
              </div>
              <span className="text-[9px] font-bold text-slate-400">12%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Priority */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-100 p-5 h-full min-h-[350px]">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Today's Priority</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg group hover:bg-slate-50 transition-colors">
                <span className="text-slate-700 font-medium text-sm">New Task</span>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-[9px] font-bold">Need Attention</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg">
                <span className="text-slate-700 font-medium text-sm">Malfoe</span>
              </div>
              {priorityTasks.length > 0 && priorityTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border-b border-slate-50">
                  <span className="text-slate-700 font-medium text-sm">{task.task_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar & Celebrations */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 leading-tight">"{currentMonth}</h3>
                <p className="text-base font-bold text-slate-800">{currentYear}</p>
              </div>
              <div className="text-right">
                <h2 className="text-5xl font-extrabold text-slate-900 leading-none">{currentDay}</h2>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-widest mt-1">{currentDayName}</p>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="mb-6">
              <div className="grid grid-cols-7 gap-y-2 text-center text-[12px] font-bold text-slate-800 mb-2">
                <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
              </div>
              <div className="grid grid-cols-7 gap-y-2 text-center text-[13px] font-medium">
                {calendarDays.map((day, idx) => (
                  <div key={idx} className={`py-0.5 rounded-md ${day === currentDay ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-3">
                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* Celebrations Section */}
            <div className="space-y-3 pt-3 border-t border-slate-50">
              <div className="bg-[#F8FDF9] p-4 rounded-xl relative">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-slate-800 text-[13px]">Malfoe</h4>
                  <span className="bg-[#E7F6EA] text-[#2D8A39] text-[9px] px-2 py-0.5 rounded-md font-bold uppercase">Celebrations</span>
                </div>
                <p className="text-[11px] font-bold text-slate-600 mb-1">Congratulations</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  You have completed 2 years in our company. Marking another year of excellence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
