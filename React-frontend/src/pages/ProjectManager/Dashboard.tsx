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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventModal, setEventModal] = useState<DashboardEvent | null>(null);
  const [announcementModal, setAnnouncementModal] = useState<Announcement | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/api/dashboard/stats'),
      api.get<{ tasks: PriorityTask[] }>('/api/dashboard/priority-tasks'),
      api.get<{ events: DashboardEvent[] }>('/api/dashboard/events'),
      api.get<{ announcements: Announcement[] }>('/api/dashboard/announcements'),
    ])
      .then(([s, p, e, a]) => {
        setStats(s.data);
        setPriorityTasks(p.data.tasks ?? []);
        setEvents(e.data.events ?? []);
        setAnnouncements(a.data.announcements ?? []);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const cards = [
    {
      title: 'New Task',
      value: stats?.newTasks ?? 0,
      sub: 'Total New Task',
      color: 'text-[#bc2d75]',
      barColor: 'bg-[#bc2d75]',
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      link: '/tasks?status=Todo',
      percent: Math.min(100, ((stats?.newTasks ?? 0) / 20) * 100),
      icon: (
        <svg className="w-8 h-8" fill="#bc2d75" viewBox="0 0 384 512">
          <path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128z" />
        </svg>
      ),
    },
    {
      title: 'Inprogress Task',
      value: stats?.inProgressTasks ?? 0,
      sub: 'Total Inprogress Task',
      color: 'text-amber-600',
      barColor: 'bg-amber-500',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      link: '/tasks?status=InProgress',
      percent: Math.min(100, ((stats?.inProgressTasks ?? 0) / 15) * 100),
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 512 512">
          <path d="M304 48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zm0 416a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM48 304a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm464-48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM142.9 437A48 48 0 1 0 75 369.1 48 48 0 1 0 142.9 437zm0-294.2A48 48 0 1 0 75 75a48 48 0 1 0 67.9 67.9zM369.1 437A48 48 0 1 0 437 369.1 48 48 0 1 0 369.1 437z" />
        </svg>
      ),
    },
    {
      title: 'Projects Involved',
      value: stats?.completedTasks ?? 0,
      sub: 'Total Projects',
      color: 'text-blue-600',
      barColor: 'bg-blue-500',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      link: '/projects',
      percent: Math.min(100, ((stats?.completedTasks ?? 0) / 10) * 100),
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 448 512">
          <path d="M0 64C0 28.7 28.7 0 64 0h128v128c0 17.7 14.3 32 32 32h128v288c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0l128 128z" />
        </svg>
      ),
    },
    {
      title: 'Due Today',
      value: stats?.totaltoday ?? 0,
      sub: "Today's Due Task",
      color: 'text-emerald-600',
      barColor: 'bg-emerald-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      link: '/tasks?period=today',
      percent: Math.min(100, ((stats?.totaltoday ?? 0) / 10) * 100),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.link}
            className={`block p-5 rounded-xl border ${card.border} ${card.bg} hover:shadow-md transition-shadow cursor-pointer`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-slate-700">{card.title}</h3>
            </div>
            <p className={`text-2xl font-bold ${card.color} flex items-center gap-2`}>
              {card.icon}
              {card.value}
            </p>
            <p className="text-sm text-slate-500 mt-1">{card.sub}</p>
            <div className="mt-2 h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full ${card.barColor} rounded-full transition-all`}
                style={{ width: `${card.percent}%` }}
              />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Today's Priority</h2>
            </div>
            <div className="p-4 space-y-3">
              {priorityTasks.length === 0 ? (
                <p className="text-center text-slate-500 py-6">No tasks assigned for today.</p>
              ) : (
                priorityTasks.map((t) => (
                  <Link
                    key={t.id}
                    to={`/tasks/${t.id}`}
                    className="block p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-slate-800">{t.task_name ?? 'Task'}</h4>
                        <p className="text-sm text-slate-500 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(t.due_date)}
                          </span>
                          {t.project_name && (
                            <span className="ml-2 text-slate-400">· {t.project_name}</span>
                          )}
                        </p>
                      </div>
                      {t.category && (
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${t.category === 'Bug' ? 'bg-red-100 text-red-700' : t.category === 'Improvement' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                            }`}
                        >
                          {t.category}
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-medium uppercase text-slate-500">Events</span>
              <h2 className="text-lg font-semibold text-slate-800">Events & Notice</h2>
            </div>
            <div className="p-3 max-h-48 overflow-y-auto space-y-2">
              {events.length === 0 ? (
                <p className="text-sm text-slate-500 p-2">No upcoming events.</p>
              ) : (
                events.map((ev, i) => (
                  <button
                    key={ev.id ?? i}
                    type="button"
                    onClick={() => setEventModal(ev)}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition"
                  >
                    <p className="font-medium text-slate-800 truncate">{ev.title ?? 'Event'}</p>
                    {ev.date && <p className="text-xs text-slate-500">{formatDate(ev.date)}</p>}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-medium uppercase text-slate-500">Notice</span>
              <h2 className="text-lg font-semibold text-slate-800">Announcements</h2>
            </div>
            <div className="p-3 max-h-48 overflow-y-auto space-y-2">
              {announcements.length === 0 ? (
                <p className="text-sm text-slate-500 p-2">No announcements available.</p>
              ) : (
                announcements.map((a, i) => (
                  <button
                    key={a.id ?? i}
                    type="button"
                    onClick={() => setAnnouncementModal(a)}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition"
                  >
                    <p className="font-medium text-slate-800 truncate">{a.title ?? 'Announcement'}</p>
                    {a.date && <p className="text-xs text-slate-500">{formatDate(a.date)}</p>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {eventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEventModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{eventModal.title ?? 'Event'}</h3>
              <button type="button" onClick={() => setEventModal(null)} className="p-1 rounded hover:bg-slate-100 text-slate-500">×</button>
            </div>
            <div className="text-sm text-slate-600 space-y-2">
              {eventModal.details && <p>{eventModal.details}</p>}
              {eventModal.date && <p><strong>Date:</strong> {formatDate(eventModal.date)}</p>}
              {(eventModal.start_time || eventModal.end_time) && (
                <p><strong>Time:</strong> {eventModal.start_time ?? ''} {eventModal.end_time ? `– ${eventModal.end_time}` : ''}</p>
              )}
              {eventModal.location && <p><strong>Location:</strong> {eventModal.location}</p>}
            </div>
          </div>
        </div>
      )}

      {announcementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setAnnouncementModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{announcementModal.title ?? 'Announcement'}</h3>
              <button type="button" onClick={() => setAnnouncementModal(null)} className="p-1 rounded hover:bg-slate-100 text-slate-500">×</button>
            </div>
            <div className="text-sm text-slate-600 space-y-2">
              {announcementModal.content && <p>{announcementModal.content}</p>}
              {announcementModal.date && <p className="text-slate-500">{formatDate(announcementModal.date)}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
