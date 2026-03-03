import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';

interface LocationEntry {
    id: number;
    full_name?: string;
    /** Original attendance date string (d-m-Y or Y-m-d) */
    date?: string | null;
    /** Normalised ISO date from backend (YYYY-MM-DD) */
    date_iso?: string | null;
    /** Time in from attendance table (HH:MM:SS format) */
    time_in?: string | null;
    /** Time out from attendance table, if available (HH:MM:SS format) */
    time_out?: string | null;
    /** Calculated total hours (HH:MM:SS format), if available */
    total_hours?: string | null;
    /** Derived status (Online / Offline) */
    status?: 'Online' | 'Offline' | string | null;
}

// Fallback demo data if API has no locations or fails
const DUMMY_DATA: LocationEntry[] = [
    { id: 1001, full_name: 'Binghatti', date_iso: new Date().toISOString().split('T')[0], status: 'Online' },
    { id: 1002, full_name: 'Suo01', date_iso: new Date().toISOString().split('T')[0], status: 'Offline' },
    { id: 1003, full_name: 'Disu so', date_iso: new Date().toISOString().split('T')[0], status: 'Online' },
    { id: 1004, full_name: 'Tshingin', date_iso: new Date().toISOString().split('T')[0], status: 'Offline' },
    { id: 1005, full_name: 'Ajay Srinivasan', date_iso: new Date().toISOString().split('T')[0], status: 'Online' },
    { id: 1006, full_name: 'V L LOKESH', date_iso: new Date().toISOString().split('T')[0], status: 'Offline' },
    { id: 1007, full_name: 'BASAVARAJ DÂ E', date_iso: new Date().toISOString().split('T')[0], status: 'Online' },
];

export default function TrackerTD() {
    const [list, setList] = useState<LocationEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [statusOpen, setStatusOpen] = useState(false);
    const statusOptions = ['', 'Online', 'Offline'];
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Select Date';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    // Convert a date string into YYYY-MM-DD for filtering.
    // Prefer ISO date from backend (date_iso); fall back to parsing the raw date string.
    const toLocalDateKey = (date_iso?: string | null, rawDate?: string | null): string => {
        if (date_iso) return date_iso;
        const value = rawDate || '';
        if (!value) return '';
        // Try d-m-Y then Y-m-d
        const partsDash = value.split('-');
        if (partsDash.length === 3) {
            if (partsDash[0].length === 2) {
                // d-m-Y -> Y-m-d
                const [d, m, y] = partsDash;
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
            if (partsDash[0].length === 4) {
                // already Y-m-d
                const [y, m, d] = partsDash;
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
        }
        return '';
    };

    useEffect(() => {
        api
            .get<{ records?: LocationEntry[] }>('/api/attendance/tracker')
            .then(({ data }) => {
                const records = (data.records ?? []).map((item) => {
                    const statusValue = (item.status || '').toString().toLowerCase() === 'online' ? 'Online' : 'Offline';
                    return { ...item, status: statusValue };
                });

                if (records.length) {
                    setList(records);
                } else {
                    setList(DUMMY_DATA);
                }
            })
            .catch(() => {
                setList(DUMMY_DATA);
            })
            .finally(() => setLoading(false));
    }, []);

    // Close status dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setStatusOpen(false);
            }
        };
        if (statusOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [statusOpen]);

    const filteredList = list.filter((item) => {
        let matchesDate = true;
        let matchesStatus = true;

        if (selectedDate) {
            // selectedDate is already in YYYY-MM-DD format from the date input
            const itemDate = toLocalDateKey(item.date_iso, item.date ?? null);
            // Compare date strings directly
            matchesDate = itemDate === selectedDate;
        }

        if (selectedStatus) {
            matchesStatus = item.status === selectedStatus;
        }

        return matchesDate && matchesStatus;
    });

    const handleDownload = () => {
        if (filteredList.length === 0) return;

        const headers = ['Sl.No', 'Date', 'Employee Name', 'Time In', 'Time Out', 'Total Hours', 'Status'];
        const csvData = filteredList.map((loc, index) => {
            const slNo = (index + 1).toString().padStart(2, '0');
            const dateKey = toLocalDateKey(loc.date_iso, loc.date ?? null);
            const [y, m, d] = dateKey ? dateKey.split('-') : ['', '', ''];
            const formattedDate = dateKey ? `${d}/${m}/${y}` : '';

            const rawTimeIn = loc.time_in || '';
            const rawTimeOut = loc.time_out || '';
            const totalHours = loc.total_hours || '';

            return [
                slNo,
                formattedDate,
                loc.full_name || 'N/A',
                rawTimeIn,
                rawTimeOut,
                totalHours,
                loc.status || '-'
            ].map(val => `"${val || ''}"`).join(',');
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
        <div className="p-1 space-y-8 flex flex-col h-full bg-white">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 px-2">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <h2 className="text-2xl font-semibold text-[#000000]">Employee Tracking</h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Select Date Filter */}
                    <div
                        className="relative flex items-center justify-between gap-2 px-4 py-2 bg-[#EAEAEA] rounded-md hover:bg-gray-200 transition-all group min-w-[130px] cursor-pointer"
                        onClick={() => { dateInputRef.current?.showPicker?.(); dateInputRef.current?.focus(); }}
                    >
                        <span className={`text-sm font-medium flex-1 ${selectedDate ? 'text-[#353535]' : 'text-[#616161]'}`}>
                            {formatDate(selectedDate)}
                        </span>
                        {selectedDate && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate('');
                                }}
                                className="text-[#616161] hover:text-[#353535] transition-colors"
                                title="Clear date filter"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        )}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                            <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01" />
                        </svg>
                        <input
                            ref={dateInputRef}
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
                            <div
                                className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[130px] py-1"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {statusOptions.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedStatus(opt);
                                            setStatusOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${selectedStatus === opt ? 'text-[#353535] bg-gray-50' : 'text-[#616161] hover:text-[#353535] hover:bg-gray-50'}`}
                                    >
                                        {opt === '' ? 'All Status' : opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        disabled={filteredList.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[#DD4342] text-white rounded-md font-gantari font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 15V3M12 15L8 11M12 15L16 11M5 20H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[16px]">Download</span>
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl border border-[#AEACAC52] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
                <div className="overflow-auto custom-scrollbar smooth-scroll flex-1 pr-1" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                    <table className="min-w-full border-collapse">
                        <thead className="sticky top-0 z-10 bg-white">
                            <tr className="border-b border-gray-100 bg-white">
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Sl.No</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Date</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Employee Name</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Time In</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Time Out</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Total Hours</th>
                                <th className="px-3 py-4 text-center text-base font-bold text-[#353535] bg-white font-gantari whitespace-nowrap">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-3 py-12 text-center text-gray-400 font-medium font-gantari bg-white">
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                filteredList.map((loc, index) => {
                                    const slNo = (index + 1).toString().padStart(2, '0');
                                    const dateKey = toLocalDateKey(loc.date_iso, loc.date ?? null);
                                    const [y, m, d] = dateKey ? dateKey.split('-') : ['', '', ''];
                                    const formattedDate = dateKey ? `${d}/${m}/${y}` : '-';

                                    const timeIn = loc.time_in || '-';
                                    const timeOut = loc.time_out || '-';
                                    const totalHours = loc.total_hours || '-';

                                    return (
                                        <tr key={loc.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap">{slNo}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap">{formattedDate}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-semibold font-gantari whitespace-nowrap">{loc.full_name ?? 'N/A'}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap">{timeIn}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-gantari whitespace-nowrap">{timeOut}</td>
                                            <td className="px-3 py-3 text-center text-sm text-[#353535] font-medium font-gantari whitespace-nowrap">{totalHours}</td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                <span className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold font-gantari ${loc.status === 'Online' ? 'bg-[#E6F4EA] text-[#1E7E34]' : 'bg-[#FCE8E8] text-[#D93025]'}`}>
                                                    {loc.status || 'Offline'}
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


