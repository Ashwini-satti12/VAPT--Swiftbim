import { useEffect, useState } from 'react';
import api from '../../lib/api';

interface AttendanceEntry {
    id: number;
    employee_id?: string;
    full_name?: string;
    date?: string; // DD-MM-YYYY format (from backend)
    date_iso?: string; // YYYY-MM-DD format (normalised)
    time_in?: string; // HH:MM:SS
    time_out?: string | null; // HH:MM:SS or null
    total_hours?: string | null; // hours as string or null
    status?: string; // Online / Offline or raw value
}

export default function TrackerBL() {
    const [list, setList] = useState<AttendanceEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [statusOpen, setStatusOpen] = useState(false);
    const statusOptions = ['', 'Online', 'Offline'];

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Select Date';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    // Determine status from attendance record
    const getStatus = (entry: AttendanceEntry): 'Online' | 'Offline' => {
        const statusStr = String(entry.status || '').trim();
        if (statusStr.toLowerCase() === 'online') return 'Online';
        if (statusStr.toLowerCase() === 'offline') return 'Offline';
        // If status not set, infer from time_out: no time_out => Online, else Offline
        if (!entry.time_out || entry.time_out.trim() === '' || entry.time_out === 'null') {
            return 'Online';
        }
        return 'Offline';
    };

    // Format time from HH:MM:SS to 12-hour format with seconds
    const formatTime = (timeStr: string | null | undefined): string => {
        if (!timeStr || timeStr.trim() === '') return 'N/A';
        try {
            const [hours, minutes, seconds] = timeStr.split(':');
            const hour = parseInt(hours, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
        } catch {
            return timeStr;
        }
    };

    // Format total hours similar to other trackers
    const formatTotalHours = (
        hours: string | null | undefined,
        timeIn?: string,
        timeOut?: string | null
    ): string => {
        if (hours && hours.trim() !== '') {
            const numHours = parseFloat(hours);
            if (!isNaN(numHours)) {
                const h = Math.floor(numHours);
                const m = Math.round((numHours - h) * 60);
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
            }
        }

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

    // Fetch attendance data whenever selectedDate changes
    useEffect(() => {
        setLoading(true);
        const params: { date?: string } = {};
        if (selectedDate) {
            params.date = selectedDate; // YYYY-MM-DD expected by API
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

    const filteredList = list.filter((item) => {
        let matchesStatus = true;

        // Date filtering is handled by API via `selectedDate`
        if (selectedStatus) {
            const itemStatus = getStatus(item);
            matchesStatus = itemStatus === selectedStatus;
        }

        return matchesStatus;
    });

    const handleDownload = () => {
        if (filteredList.length === 0) return;

        const headers = ['Sl.No', 'Date', 'Employee Name', 'Time In', 'Time Out', 'Total Hours', 'Status'];
        const csvData = filteredList.map((entry, index) => {
            const slNo = (index + 1).toString().padStart(2, '0');
            const formattedDate = entry.date ? entry.date.replace(/-/g, '/') : 'N/A';
            const timeIn = formatTime(entry.time_in);
            const timeOut = formatTime(entry.time_out || null);
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
                    <div className="relative min-w-[120px]" onBlur={() => setTimeout(() => setStatusOpen(false), 150)}>
                        <button type="button" onClick={() => setStatusOpen(o => !o)}
                            className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all cursor-pointer">
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
                                    <button key={opt} type="button" onClick={() => { setSelectedStatus(opt); setStatusOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${selectedStatus === opt ? 'text-[#353535]' : 'text-[#616161] hover:text-[#353535]'}`}>
                                        {opt === '' ? 'Status' : opt}
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
                <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 pr-1" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                    <table className="min-w-full border-collapse">
                        <thead className="sticky top-0 z-10 bg-white">
                            <tr className="border-b border-gray-100 bg-white">
                                <th className="px-6 py-4 text-center text-md font-bold text-gray-700 bg-white">Sl.No</th>
                                <th className="px-6 py-4 text-center text-md font-bold text-gray-700 bg-white">Date</th>
                                <th className="px-6 py-4 text-center text-md font-bold text-gray-700 bg-white">Employee Name</th>
                                <th className="px-6 py-4 text-center text-md font-bold text-gray-700 bg-white">Time In</th>
                                <th className="px-6 py-4 text-center text-md font-bold text-gray-700 bg-white">Time Out</th>
                                <th className="px-6 py-4 text-center text-md font-bold text-gray-700 bg-white">Total Hours</th>
                                <th className="px-6 py-4 text-center text-md font-bold text-gray-700 bg-white">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium bg-white">
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                filteredList.map((entry, index) => {
                                    const slNo = (index + 1).toString().padStart(2, '0');
                                    const formattedDate = entry.date ? entry.date.replace(/-/g, '/') : 'N/A';
                                    const timeIn = formatTime(entry.time_in);
                                    const timeOut = formatTime(entry.time_out || null);
                                    const totalHours = formatTotalHours(entry.total_hours, entry.time_in, entry.time_out);
                                    const status = getStatus(entry);

                                    return (
                                        <tr key={entry.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}>
                                            <td className="px-6 py-3 text-center text-sm text-gray-500 font-medium">{slNo}</td>
                                            <td className="px-6 py-3 text-center text-sm text-gray-600">{formattedDate}</td>
                                            <td className="px-6 py-3 text-center text-sm text-gray-800 font-semibold">{entry.full_name ?? 'N/A'}</td>
                                            <td className="px-6 py-3 text-center text-sm text-gray-600">{timeIn}</td>
                                            <td className="px-6 py-3 text-center text-sm text-gray-600">{timeOut}</td>
                                            <td className="px-6 py-3 text-center text-sm text-gray-600 font-medium">{totalHours}</td>
                                            <td className="px-6 py-3 text-center">
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


