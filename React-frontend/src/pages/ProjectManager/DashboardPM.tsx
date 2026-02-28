import { useEffect, useState } from 'react';


export default function DashboardPM() {
  const [loading, setLoading] = useState(true);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);

  // Calendar navigation state
  const today = new Date();
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  useEffect(() => {
    setLoading(false);
  }, []);

  // Calendar Logic — derived from displayMonth/displayYear
  const displayDate = new Date(displayYear, displayMonth, 1);
  const displayMonthName = displayDate.toLocaleString('default', { month: 'long' });

  const currentDay = today.getDate();

  // Selected date display values for the header
  const headerDay = selectedDate.getDate();
  const headerDayName = selectedDate.toLocaleString('default', { weekday: 'long' }).toUpperCase();
  const headerMonth = selectedDate.toLocaleString('default', { month: 'long' });
  const headerYear = selectedDate.getFullYear();

  const isCurrentMonth =
    displayMonth === today.getMonth() && displayYear === today.getFullYear();

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(displayYear, displayMonth);
  const firstDay = getFirstDayOfMonth(displayYear, displayMonth);

  // Previous month trailing days
  const prevMonthDays = getDaysInMonth(
    displayMonth === 0 ? displayYear - 1 : displayYear,
    displayMonth === 0 ? 11 : displayMonth - 1
  );

  const calendarDays: { day: number; type: 'prev' | 'current' | 'next' }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, type: 'prev' });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, type: 'current' });
  }
  // Fill remaining cells to complete the last week row
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      calendarDays.push({ day: i, type: 'next' });
    }
  }

  // Navigation handlers
  const goToPrevMonth = () => {
    setDisplayMonth((prev) => {
      if (prev === 0) {
        setDisplayYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const goToNextMonth = () => {
    setDisplayMonth((prev) => {
      if (prev === 11) {
        setDisplayYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const goToToday = () => {
    setDisplayMonth(today.getMonth());
    setDisplayYear(today.getFullYear());
    setSelectedDate(today);
  };

  // Date click handler
  const handleDateClick = (cell: { day: number; type: 'prev' | 'current' | 'next' }) => {
    if (cell.type === 'prev') {
      // Navigate to previous month and select the day
      const prevMonth = displayMonth === 0 ? 11 : displayMonth - 1;
      const prevYear = displayMonth === 0 ? displayYear - 1 : displayYear;
      setDisplayMonth(prevMonth);
      setDisplayYear(prevYear);
      setSelectedDate(new Date(prevYear, prevMonth, cell.day));
    } else if (cell.type === 'next') {
      // Navigate to next month and select the day
      const nextMonth = displayMonth === 11 ? 0 : displayMonth + 1;
      const nextYear = displayMonth === 11 ? displayYear + 1 : displayYear;
      setDisplayMonth(nextMonth);
      setDisplayYear(nextYear);
      setSelectedDate(new Date(nextYear, nextMonth, cell.day));
    } else {
      // Current month day
      setSelectedDate(new Date(displayYear, displayMonth, cell.day));
    }
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
      <div className="bg-white pb-4 pt-0 border-b border-transparent shrink-0">
        <h1 className="text-lg sm:text-xl font-medium font-gantari text-slate-800 mb-4 sm:mb-6">Dashboard</h1>

        {/* KPI Grid: 1 col → 2 col → 4 col */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">

          {/* Total Projects */}
          <div className="bg-[#F2F2F2] group hover:bg-[#DE3D3A] rounded-2xl border border-[#AEACAC52] p-4 sm:p-6 shadow-lg flex flex-col min-h-[120px] lg:min-h-[100px] transition-all">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-base sm:text-xl text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari leading-tight">Total<br />Projects</h3>
              </div>
              <p className="text-[24px] sm:text-[28px] lg:text-[32px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none pt-1">115</p>
            </div>
            <div className="mt-auto w-full">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[11px] sm:text-[12px] text-[#353535] group-hover:text-[#F2F2F2] font-medium font-gantari whitespace-nowrap">Total Projects</p>
                <span className="text-[11px] sm:text-[12px] text-[#717171] group-hover:text-[#F2F2F2] font-bold">35%</span>
              </div>
              <div className="h-2 w-full bg-white rounded-full flex items-center px-1 overflow-hidden">
                <div className="h-1 bg-[#DE3D3A] rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>
          </div>

          {/* Completed Projects */}
          <div className="bg-[#F2F2F2] group hover:bg-[#DE3D3A] border border-[#AEACAC52] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col min-h-[120px] lg:min-h-[100px] transition-all">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-base sm:text-xl text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari leading-tight">Completed<br />Projects</h3>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-[24px] sm:text-[28px] lg:text-[32px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">24</p>
              </div>
            </div>
            <div className="mt-auto w-full">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[11px] sm:text-[12px] text-[#353535] group-hover:text-[#F2F2F2] font-medium font-gantari whitespace-nowrap">Total Completed Projects</p>
                <span className="text-[11px] sm:text-[12px] text-[#717171] group-hover:text-[#F2F2F2] font-bold">12%</span>
              </div>
              <div className="h-2 w-full bg-white rounded-full flex items-center px-1 overflow-hidden">
                <div className="h-1 bg-[#00882E] rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>
          </div>

          {/* In-Progress Tasks */}
          <div className="bg-[#F2F2F2] group hover:bg-[#DE3D3A] border border-[#AEACAC52] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col min-h-[120px] lg:min-h-[100px] transition-all">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-base sm:text-xl text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari leading-tight">In-Progress<br />Task</h3>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-[24px] sm:text-[28px] lg:text-[32px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">24</p>
              </div>
            </div>
            <div className="mt-auto w-full">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[11px] sm:text-[12px] text-[#353535] group-hover:text-[#F2F2F2] font-medium font-gantari whitespace-nowrap">Total In-Progress Task</p>
                <span className="text-[11px] sm:text-[12px] text-[#717171] group-hover:text-[#F2F2F2] font-bold">12%</span>
              </div>
              <div className="h-2 w-full bg-white rounded-full flex items-center px-1 overflow-hidden">
                <div className="h-1 bg-[#E47E00] rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>
          </div>

          {/* Completed Tasks */}
          <div className="bg-[#F2F2F2] group hover:bg-[#DE3D3A] border border-[#AEACAC52] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col min-h-[120px] lg:min-h-[100px] transition-all">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-base sm:text-xl text-[#353535] group-hover:text-[#F2F2F2] font-semibold font-gantari leading-tight">Completed<br />Task</h3>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-[24px] sm:text-[28px] lg:text-[32px] text-[#353535] group-hover:text-[#F2F2F2] font-bold leading-none">24</p>
              </div>
            </div>
            <div className="mt-auto w-full">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[11px] sm:text-[12px] text-[#353535] group-hover:text-[#F2F2F2] font-medium font-gantari whitespace-nowrap">Total Completed Task</p>
                <span className="text-[11px] sm:text-[12px] text-[#717171] group-hover:text-[#F2F2F2] font-bold">12%</span>
              </div>
              <div className="h-2 w-full bg-white rounded-full flex items-center px-1 overflow-hidden">
                <div className="h-1 bg-[#00882E] rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom section: Priority + Calendar */}
      {/* On mobile/tablet: stacked. On lg+: side-by-side. */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 py-4 overflow-visible lg:overflow-hidden">

        {/* Today's Priority */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-[#AEACAC52] shadow-sm pt-4 pl-4 pb-4 pr-0 h-[400px] sm:h-[480px] lg:h-full overflow-hidden">
          <h2 className="text-base sm:text-xl font-semibold text-[#353535] font-gantari mb-4 sm:mb-6">Today's Priority</h2>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3 sm:space-y-4">
            {[1, 2, 3, 4, 5, 6].map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 sm:gap-5 p-3 sm:p-5 bg-[#F2F2F2] rounded-xl border border-transparent hover:border-slate-200 transition-all group shrink-0 relative"
              >
                {/* Circular timer */}
                <div className="relative w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="40" cy="40" r="36"
                      stroke="#E5E7EB" strokeWidth="5" fill="transparent" className="opacity-40"
                    />
                    <circle
                      cx="40" cy="40" r="36"
                      stroke="#00882E" strokeWidth="5" fill="transparent"
                      strokeDasharray="226"
                      strokeDashoffset={100 + (idx * 20)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[8px] sm:text-[10px] font-bold text-black font-mono">hh:mm:ss</span>
                </div>

                {/* Task Info */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="mb-1 sm:mb-2">
                    <h3 className="text-base sm:text-xl font-bold text-[#353535] truncate mb-0.5">Task Name</h3>
                    <p className="text-[12px] sm:text-[14px] text-[#353535] font-medium leading-tight">
                      dd/mm/yyyy - hh:mm:ss <span className="text-[#AEACAC]">AM/PM</span>
                    </p>
                  </div>
                </div>

                {/* Badge (Top Right) */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
                  <span className="bg-[#DBE9FE] text-[#101827] text-[10px] sm:text-[12px] px-2.5 sm:px-3.5 py-1 rounded-md font-medium font-gantari tracking-tight">
                    Task
                  </span>
                </div>

                {/* Overlapping Avatars (Bottom Right) */}
                <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 flex -space-x-3 sm:-space-x-4">
                  {[1, 2, 3].map((v) => (
                    <div
                      key={v}
                      className="w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 border-white bg-white shadow-sm flex items-center justify-center overflow-hidden"
                    >
                      <div className="w-full h-full bg-[#E5E5E5] flex items-center justify-center text-[9px] sm:text-[11px] font-bold text-[#353535]">
                        {String.fromCharCode(64 + v + idx)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar & Celebrations */}
        <div className="lg:col-span-1 flex flex-col h-[500px] sm:h-[560px] lg:h-full overflow-hidden">
          <div className="bg-white rounded-2xl border border-[#AEACAC52] pt-4 pl-4 pb-4 pr-0 shadow-sm flex flex-col h-full overflow-hidden">

            {/* Calendar Header — shows selected date info */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-12 mb-4 sm:mb-6 shrink-0 pt-2 px-2">
              <div className="flex flex-col items-start min-w-[70px] sm:min-w-[80px]">
                <span className="text-[16px] sm:text-[18px] lg:text-[20px] font-bold text-[#020202] font-gantari leading-tight">
                  {headerMonth}
                </span>
                <span className="text-[16px] sm:text-[18px] lg:text-[20px] font-bold text-[#020202] font-gantari leading-tight">{headerYear}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[28px] sm:text-[32px] lg:text-[40px] font-bold text-black leading-none tracking-tighter">{headerDay}</span>
              </div>
              <div className="flex flex-col items-start min-w-[70px] sm:min-w-[80px]">
                <span className="text-[14px] sm:text-[16px] lg:text-[20px] font-bold text-black font-gantari tracking-wide">{headerDayName}</span>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pl-2 pr-1 space-y-2">

              {/* Calendar Grid */}
              {isCalendarExpanded && (
                <div className="mb-2 py-2 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-300">

                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-3 pr-3">
                    <button
                      onClick={goToPrevMonth}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F2F2F2] transition-colors text-[#353535] hover:text-[#DE3D3A]"
                      aria-label="Previous month"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-[14px] sm:text-[16px] font-bold text-[#353535] font-gantari">
                        {displayMonthName} {displayYear}
                      </span>
                      {!isCurrentMonth && (
                        <button
                          onClick={goToToday}
                          className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md bg-[#DE3D3A] text-white font-semibold font-gantari hover:bg-[#c43432] transition-colors"
                        >
                          Today
                        </button>
                      )}
                    </div>

                    <button
                      onClick={goToNextMonth}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F2F2F2] transition-colors text-[#353535] hover:text-[#DE3D3A]"
                      aria-label="Next month"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] sm:text-[13px] font-bold text-slate-400 font-gantari mb-2">
                    <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-y-1 sm:gap-y-2 text-center text-[13px] sm:text-[15px] font-semibold font-gantari">
                    {calendarDays.map((cell, i) => {
                      const isTodayCell = isCurrentMonth && cell.type === 'current' && cell.day === currentDay;
                      const isSelectedCell =
                        cell.type === 'current' &&
                        selectedDate.getDate() === cell.day &&
                        selectedDate.getMonth() === displayMonth &&
                        selectedDate.getFullYear() === displayYear;
                      const isBothTodayAndSelected = isTodayCell && isSelectedCell;

                      let cellClass = 'py-1 w-8 h-8 sm:w-9 sm:h-9 mx-auto flex items-center justify-center rounded-full transition-all cursor-pointer ';

                      if (cell.type !== 'current') {
                        cellClass += 'text-[#CFCFCF] hover:text-[#999] hover:bg-[#F8F8F8]';
                      } else if (isBothTodayAndSelected) {
                        cellClass += 'bg-[#DE3D3A] text-white font-bold';
                      } else if (isTodayCell) {
                        cellClass += 'bg-[#DE3D3A] text-white font-bold hover:bg-[#c43432]';
                      } else if (isSelectedCell) {
                        cellClass += 'bg-[#FFD9D9] text-[#DE3D3A] font-bold';
                      } else {
                        cellClass += 'text-[#020202] hover:bg-[#F2F2F2]';
                      }

                      return (
                        <div
                          key={i}
                          className={cellClass}
                          onClick={() => handleDateClick(cell)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDateClick(cell); }}
                          aria-label={`${cell.type === 'current' ? '' : cell.type + ' month '}${cell.day}`}
                        >
                          {cell.day}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toggle Arrow */}
              <div className="flex justify-center mb-3 sm:mb-4">
                <button
                  onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className={`w-6 h-5 sm:w-7 sm:h-6 transform transition-transform ${isCalendarExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Celebrations Section */}
              <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-[#F8F9FA] p-4 sm:p-5 rounded-xl border border-transparent hover:border-slate-200 transition-all flex flex-col relative">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-[#353535] text-[15px] sm:text-[17px] font-gantari">Malfoe</h4>
                      <span className="bg-[#E7F6EA] text-[#2D8A39] text-[9px] sm:text-[10px] px-2 sm:px-3 py-1.5 rounded-md font-bold uppercase tracking-widest leading-none font-gantari">
                        CELEBRATIONS
                      </span>
                    </div>
                    <p className="text-[13px] sm:text-[15px] font-semibold text-slate-700 mb-1 font-gantari">Congratulations</p>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-gantari">
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
