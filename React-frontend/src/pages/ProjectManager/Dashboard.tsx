import { useEffect, useState } from 'react';
import api from '../../lib/api';

interface PriorityTask {
  id: number;
  task_name?: string;
  due_date?: string;
  status?: string;
  category?: string;
  project_name?: string;
}

export default function Dashboard() {
  const [priorityTasks, setPriorityTasks] = useState<PriorityTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ tasks: PriorityTask[] }>('/api/dashboard/priority-tasks'),
    ])
      .then(([p]) => {
        setPriorityTasks(p.data.tasks ?? []);
      })
      .catch(() => {
        console.error("Failed to load dashboard data");
      })
      .finally(() => setLoading(false));
  }, []);

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
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <span className="text-xl font-bold text-black leading-tight">“{currentMonth}</span>
                <span className="text-xl font-bold text-black">{currentYear}</span>
              </div>
              <div className="flex-1 flex justify-center">
                <span className="text-[64px] font-bold text-black leading-none">{currentDay}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold text-black tracking-wider">{currentDayName}</span>
              </div>
            </div>

            {/* Collapse/Expand Toggle */}
            <div className="flex justify-center mb-4">
              <button
                onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                className="p-1 hover:bg-slate-50 rounded-full transition-colors"
              >
                {isCalendarExpanded ? (
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            </div>

            {/* Calendar Grid */}
            {isCalendarExpanded && (
              <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-7 gap-y-3 text-center text-sm font-bold text-black mb-3">
                  <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                </div>
                <div className="grid grid-cols-7 gap-y-4 text-center text-base font-semibold">
                  {/* Previous month days (mocked as grey) */}
                  <div className="text-slate-300 py-1">29</div>
                  <div className="text-slate-300 py-1">30</div>

                  {/* Actual days mapped from month logic could go here, but match image for now */}
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(d => (
                    <div key={d} className="text-black py-1">{d}</div>
                  ))}
                  <div className="text-[#E00100] py-1 font-bold">13</div>
                  {[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].map(d => (
                    <div key={d} className="text-black py-1">{d}</div>
                  ))}

                  {/* Next month days (mocked as grey) */}
                  <div className="text-slate-300 py-1">1</div>
                  <div className="text-slate-300 py-1">2</div>
                </div>
              </div>
            )}

            {/* Celebrations Section */}
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-[#F8F9F9] p-4 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-black text-sm">Malfoe</h4>
                    <span className="bg-[#E7F6EA] text-[#2D8A39] text-[10px] px-2.5 py-1 rounded-md font-bold">Celebrations</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mb-1">Congratulations</p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    You have completed 2 years in our company. Marking another year of excellence,
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
