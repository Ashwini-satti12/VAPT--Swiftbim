import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';

interface AttendanceEntry {
  id: number;
  employee_id?: string;
  full_name?: string;
  date?: string; // DD-MM-YYYY format
  date_iso?: string; // YYYY-MM-DD format
  time_in?: string; // HH:MM:SS format
  time_out?: string | null; // HH:MM:SS format or null
  total_hours?: string | null; // hours as string or null
  status?: string; // "1" for Online, "0" for Offline, or other status
}

export default function TrackerPM() {
  const [list, setList] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const statusOptions = ['', 'Online', 'Offline'];
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [showSizeOpen, setShowSizeOpen] = useState(false);
  const pageSizeOptions = [10, 20, 50, 100];
  
  // Refs for click outside detection
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const showSizeDropdownRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Determine status from attendance data
  const getStatus = (entry: AttendanceEntry): 'Online' | 'Offline' => {
    // Check status field - "1" means Online, "0" means Offline
    const statusStr = String(entry.status || '').trim();
    if (statusStr === '1') return 'Online';
    if (statusStr === '0') return 'Offline';
    
    // If status is not set, determine from time_out
    // If time_out is null or empty, employee is still Online (hasn't checked out)
    if (!entry.time_out || entry.time_out.trim() === '' || entry.time_out === 'null') {
      return 'Online';
    }
    // Otherwise, they've checked out, so Offline
    return 'Offline';
  };

  // Extract pure time (HH:MM:SS) from a time or datetime string
  const extractTime = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    const match = trimmed.match(/(\d{1,2}:\d{2}:\d{2})/);
    return match ? match[1] : trimmed;
  };

  // Format time to HH:MM:SS (24‑hour) for display
  const formatTime = (timeStr: string | null | undefined): string => {
    if (!timeStr || timeStr.trim() === '') return 'N/A';
    try {
      const pure = extractTime(timeStr);
      const [hours, minutes, seconds = '00'] = pure.split(':');
      const h = hours.padStart(2, '0');
      const m = minutes.padStart(2, '0');
      const s = seconds.padStart(2, '0');
      return `${h}:${m}:${s}`;
    } catch {
      return timeStr;
    }
  };

  // Format total hours
  const formatTotalHours = (hours: string | null | undefined, timeIn?: string, timeOut?: string | null): string => {
    if (hours && hours.trim() !== '') {
      const numHours = parseFloat(hours);
      if (!isNaN(numHours)) {
        const h = Math.floor(numHours);
        const m = Math.round((numHours - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
      }
    }
    // If no total_hours, try to calculate from time_in and time_out
    if (timeIn && timeOut) {
      try {
        const [h1, m1, s1] = timeIn.split(':').map(Number);
        const [h2, m2, s2] = timeOut.split(':').map(Number);
        const totalSeconds = (h2 * 3600 + m2 * 60 + s2) - (h1 * 3600 + m1 * 60 + s1);
        if (totalSeconds > 0) {
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          const s = totalSeconds % 60;
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
      } catch {
        // Ignore calculation errors
      }
    }
    return 'N/A';
  };

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusOpen(false);
      }
      if (showSizeDropdownRef.current && !showSizeDropdownRef.current.contains(event.target as Node)) {
        setShowSizeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch attendance data when date changes
  useEffect(() => {
    setLoading(true);
    const params: { date?: string } = {};
    if (selectedDate) {
      params.date = selectedDate; // API expects YYYY-MM-DD format
    }

    api
      .get<{ records?: AttendanceEntry[] }>('/api/attendance/tracker', { params })
      .then(({ data }) => {
        const records = data.records || [];
        setList(records);
      })
      .catch((error) => {
        console.error('Error fetching attendance data:', error);
        setList([]);
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  // Reset to first page when status filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedStatus]);

  const filteredList = list.filter((item) => {
    let matchesStatus = true;

    // Date filtering is handled by API, so we don't need to filter by date here
    // But we can still filter by status on the client side
    if (selectedStatus) {
      const itemStatus = getStatus(item);
      matchesStatus = itemStatus === selectedStatus;
    }

    return matchesStatus;
  });

  const totalPages = Math.ceil(filteredList.length / pageSize);
  const paginatedList = filteredList.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
    setShowSizeOpen(false);
  };

  const handleDownload = () => {
    if (filteredList.length === 0) return;

    const headers = ['Sl.No', 'Date', 'Employee Name', 'Time In', 'Time Out', 'Total Hours', 'Status'];
    const csvData = filteredList.map((entry, index) => {
      const slNo = (index + 1).toString().padStart(2, '0');
      // Format date from DD-MM-YYYY to DD/MM/YYYY for CSV
      const formattedDate = entry.date ? entry.date.replace(/-/g, '/') : 'N/A';
      const timeIn = formatTime(entry.time_in);
      const timeOut = formatTime(entry.time_out);
      const totalHours = formatTotalHours(entry.total_hours, entry.time_in, entry.time_out);
      const status = getStatus(entry);

      return [
        slNo,
        formattedDate,
        entry.full_name || 'N/A',
        timeIn,
        timeOut,
        totalHours,
        status
      ].map(val => `"${val}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
    link.setAttribute('href', url);
    link.setAttribute('download', `tracking-report-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-1 md:p-6 space-y-8 flex flex-col h-full bg-white">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h2 className="text-2xl font-bold text-gray-900">Employee Tracking</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Select Date Filter */}
          <div className="relative flex items-center justify-between gap-3 px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer group min-w-[130px]">
            <span className={`text-sm font-medium ${selectedDate ? 'text-[#353535]' : 'text-[#616161]'}`}>
              {formatDate(selectedDate)}
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01" />
            </svg>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              style={{ colorScheme: 'light' }}
            />
          </div>

          {/* Status Custom Dropdown */}
          <div className="relative min-w-[120px]" ref={statusDropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setStatusOpen(o => !o);
              }}
              className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer"
            >
              <span className={`text-sm font-medium ${selectedStatus ? 'text-[#353535]' : 'text-[#616161]'}`}>
                {selectedStatus || 'Status'}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: statusOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {statusOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[130px] py-1">
                {statusOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStatus(opt);
                      setStatusOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${selectedStatus === opt
                      ? 'text-[#353535] bg-gray-50'
                      : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'
                      }`}
                  >
                    {opt === '' ? 'Status' : opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Show Entries */}
          <div className="relative flex items-center gap-2" ref={showSizeDropdownRef}>
            <span className="text-sm text-[#616161] font-medium">Show:</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSizeOpen(o => !o);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer"
            >
              <span className="text-sm font-medium text-[#353535]">{pageSize}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showSizeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showSizeOpen && (
              <div className="absolute top-full left-8 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[80px]">
                {pageSizeOptions.map(size => (
                  <button 
                    key={size} 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePageSizeChange(size);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${pageSize === size 
                      ? 'text-[#353535] bg-gray-50' 
                      : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'
                    }`}>
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={filteredList.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold hover:bg-[#c43a39] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V3M12 15L8 11M12 15L16 11M5 20H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[16px]">Download</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
        <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 pr-1" style={{ maxHeight: 'calc(100vh - 400px)' }}>
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-100 bg-white">
                <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">Sl.No</th>
                <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">Date</th>
                <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">Employee Name</th>
                <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">Time In</th>
                <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">Time Out</th>
                <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">Total Hours</th>
                <th className="px-6 py-4 text-center text-md font-bold text-[#353535] bg-white">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium bg-white">
                    No records found
                  </td>
                </tr>
              ) : (
                paginatedList.map((entry, index) => {
                  const slNo = (currentPage * pageSize + index + 1).toString().padStart(2, '0');
                  // Format date from DD-MM-YYYY to DD/MM/YYYY
                  const formattedDate = entry.date ? entry.date.replace(/-/g, '/') : 'N/A';
                  const timeIn = formatTime(entry.time_in);
                  const timeOut = formatTime(entry.time_out);
                  const totalHours = formatTotalHours(entry.total_hours, entry.time_in, entry.time_out);
                  const status = getStatus(entry);

                  return (
                    <tr key={entry.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}>
                      <td className="px-6 py-4 text-center text-sm text-gray-500 font-medium">{slNo}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{formattedDate}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-800 font-semibold">{entry.full_name ?? 'N/A'}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{timeIn}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{timeOut}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600 font-medium">{totalHours}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold ${status === 'Online' ? 'bg-[#E6F4EA] text-[#1E7E34]' : 'bg-[#FCE8E8] text-[#D93025]'}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 0 && (
          <div className="flex items-center justify-end gap-1 px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-[#616161] font-medium mr-1">Showing:</span>
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-1 px-2 py-1 text-sm text-[#616161] hover:text-[#353535] disabled:opacity-40 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => {
              const start = i * pageSize + 1;
              const end = Math.min((i + 1) * pageSize, filteredList.length);
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentPage === i
                    ? 'bg-[#DD4342] text-white'
                    : 'text-[#616161] hover:text-[#353535]'
                    }`}
                >
                  {start}-{end}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="flex items-center gap-1 px-2 py-1 text-sm text-[#616161] hover:text-[#353535] disabled:opacity-40 transition-colors"
            >
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
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


