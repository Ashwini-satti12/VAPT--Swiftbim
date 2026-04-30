import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/api';

interface LocationEntry {
    id: number;
    full_name?: string;
    latitude?: number;
    longitude?: number;
    updated_at?: string;
    status?: 'Online' | 'Offline';
}

const DUMMY_DATA: LocationEntry[] = [
    { id: 1001, full_name: 'Binghatti', updated_at: new Date().toISOString(), status: 'Online' },
    { id: 1002, full_name: 'Suo01', updated_at: new Date().toISOString(), status: 'Offline' },
    { id: 1003, full_name: 'Disu so', updated_at: new Date().toISOString(), status: 'Online' },
    { id: 1004, full_name: 'Tshingin', updated_at: new Date().toISOString(), status: 'Offline' },
    { id: 1005, full_name: 'Ajay Srinivasan', updated_at: new Date().toISOString(), status: 'Online' },
    { id: 1006, full_name: 'V L LOKESH', updated_at: new Date().toISOString(), status: 'Offline' },
    { id: 1007, full_name: 'BASAVARAJ DÂ E', updated_at: new Date().toISOString(), status: 'Online' },
];

export default function TrackerV() {
    const [list, setList] = useState<LocationEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [statusOpen, setStatusOpen] = useState(false);
    const [employeeOpen, setEmployeeOpen] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const statusOptions = ['', 'Online', 'Offline'];
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const employeeDropdownRef = useRef<HTMLDivElement>(null);
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get('q')?.toLowerCase() || "";

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Select Date';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    useEffect(() => {
        api
            .get<{ locations?: LocationEntry[] }>('/api/location/employees')
            .then(({ data }) => {
                // Ensure dummy data or API data has status for filtering demo
                const baseData = data.locations?.length ? data.locations : DUMMY_DATA;
                const dataWithStatus = baseData.map((item, idx) => ({
                    ...item,
                    status: item.status || (idx % 2 === 0 ? 'Online' : 'Offline')
                }));
                setList(dataWithStatus);
            })
            .catch(() => {
                setList(DUMMY_DATA);
            })
            .finally(() => setLoading(false));
    }, []);

    const filteredList = list.filter((item) => {
        if (searchQuery) {
            if (!(
                (item.full_name || "").toLowerCase().includes(searchQuery) ||
                (item.status || "").toLowerCase().includes(searchQuery)
            )) {
                return false;
            }
        }

        let matchesDate = true;
        let matchesStatus = true;
        let matchesEmployee = true;

        if (selectedDate) {
            const itemDate = item.updated_at ? new Date(item.updated_at).toISOString().split('T')[0] : '';
            matchesDate = itemDate === selectedDate;
        }

        if (selectedStatus) {
            matchesStatus = item.status === selectedStatus;
        }
        if (selectedEmployee) {
            matchesEmployee = (item.full_name || '').trim() === selectedEmployee;
        }

        return matchesDate && matchesStatus && matchesEmployee;
    });
    const employeeOptions = useMemo(
        () => Array.from(new Set(list.map((item) => (item.full_name || '').trim()).filter(Boolean))),
        [list],
    );
    const employeeOptionsFiltered = useMemo(
        () => employeeOptions.filter((name) => name.toLowerCase().includes(employeeSearch.toLowerCase())),
        [employeeOptions, employeeSearch],
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setStatusOpen(false);
            }
            if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
                setEmployeeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDownload = () => {
        if (filteredList.length === 0) return;

        const headers = ['Sl.No', 'Date', 'Employee Name', 'Time In', 'Time Out', 'Total Hours', 'Status'];
        const csvData = filteredList.map((loc, index) => {
            const slNo = (index + 1).toString().padStart(2, '0');
            const dateObj = loc.updated_at ? new Date(loc.updated_at) : new Date();
            const formattedDate = dateObj.toLocaleDateString('en-GB');
            // 24‑hour HH:MM:SS
            const formattedTime = dateObj.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            return [
                slNo,
                formattedDate,
                loc.full_name || 'N/A',
                formattedTime,
                formattedTime,
                'hh:mm:ss',
                loc.status || '-'
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
                    {/* Employee Filter */}
                    <div className="relative min-w-[190px]" ref={employeeDropdownRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeOpen((o) => !o);
                            }}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-[#EAEAEA] rounded-md text-sm font-medium text-[#353535] cursor-pointer"
                        >
                            <span className={`${selectedEmployee ? 'text-[#353535]' : 'text-[#616161]'}`}>
                                {selectedEmployee || 'Select Employee'}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#616161" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: employeeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {employeeOpen && (
                            <div className="absolute top-full left-0 mt-2 z-[220] bg-white border border-[#E0E0E0] rounded-md shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15)] w-full overflow-hidden">
                                <div className="p-2">
                                    <input
                                        type="text"
                                        value={employeeSearch}
                                        onChange={(e) => setEmployeeSearch(e.target.value)}
                                        placeholder="Search employee..."
                                        className="w-full px-3 py-2 bg-[#F2F2F2] rounded-md text-[14px] text-[#353535] outline-none"
                                    />
                                </div>
                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar pb-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedEmployee('');
                                            setEmployeeOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-[14px] text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2] cursor-pointer"
                                    >
                                        Show All
                                    </button>
                                    {employeeOptionsFiltered.map((name) => (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => {
                                                setSelectedEmployee(name);
                                                setEmployeeOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-[14px] hover:bg-[#F2F2F2] cursor-pointer ${selectedEmployee === name ? 'text-[#353535] bg-[#F2F2F2]' : 'text-[#8B8B8B]'}`}
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

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
                                <th className="px-6 py-4 text-center text-base font-bold text-gray-700 bg-white">Sl.No</th>
                                <th className="px-6 py-4 text-center text-base font-bold text-gray-700 bg-white">Date</th>
                                <th className="px-6 py-4 text-center text-base font-bold text-gray-700 bg-white">Employee Name</th>
                                <th className="px-6 py-4 text-center text-base font-bold text-gray-700 bg-white">Time In</th>
                                <th className="px-6 py-4 text-center text-base font-bold text-gray-700 bg-white">Time Out</th>
                                <th className="px-6 py-4 text-center text-base font-bold text-gray-700 bg-white">Total Hours</th>
                                <th className="px-6 py-4 text-center text-base font-bold text-gray-700 bg-white">Status</th>
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
                                filteredList.map((loc, index) => {
                                    const slNo = (index + 1).toString().padStart(2, '0');
                                    const dateObj = loc.updated_at ? new Date(loc.updated_at) : new Date();
                                    const formattedDate = dateObj.toLocaleDateString('en-GB').replace(/\//g, '/');
                                    // 24‑hour HH:MM:SS
                                    const formattedTime = dateObj.toLocaleTimeString('en-GB', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: false
                                    });

                                    return (
                                        <tr key={loc.id} className={`${index % 2 === 1 ? 'bg-[#F2F2F2] hover:bg-gray-100' : 'bg-white'} transition-colors`}>
                                            <td className="px-6 py-3 text-center text-sm text-gray-500 font-medium">{slNo}</td>
                                            <td className="px-6 py-3 text-center text-sm text-gray-600">{formattedDate}</td>
                                            <td className="px-6 py-3 text-center text-sm text-gray-800 font-semibold">{loc.full_name ?? 'N/A'}</td>
                                            <td className="px-6 py-3 text-center text-sm text-gray-600">{formattedTime}</td>
                                            <td className="px-6 py-3 text-center text-sm text-gray-600">{formattedTime}</td>
                                            <td className="px-6 py-3 text-center text-sm text-gray-600 font-medium">hh:mm:ss</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold ${loc.status === 'Online' ? 'bg-[#E6F4EA] text-[#1E7E34]' : 'bg-[#FCE8E8] text-[#D93025]'}`}>
                                                    {loc.status}
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


