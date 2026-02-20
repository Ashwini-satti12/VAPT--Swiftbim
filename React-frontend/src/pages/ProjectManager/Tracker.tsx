import { useEffect, useState } from 'react';
import api from '../../lib/api';

interface LocationEntry {
  id: number;
  full_name?: string;
  latitude?: number;
  longitude?: number;
  updated_at?: string;
}

const DUMMY_DATA: LocationEntry[] = [
  { id: 1001, full_name: 'Binghatti', updated_at: new Date().toISOString() },
  { id: 1002, full_name: 'Suo01', updated_at: new Date().toISOString() },
  { id: 1003, full_name: 'Disu so', updated_at: new Date().toISOString() },
  { id: 1004, full_name: 'Tshingin', updated_at: new Date().toISOString() },
  { id: 1005, full_name: 'Ajay Srinivasan', updated_at: new Date().toISOString() },
  { id: 1006, full_name: 'V L LOKESH', updated_at: new Date().toISOString() },
  { id: 1007, full_name: 'BASAVARAJ DÂ E', updated_at: new Date().toISOString() },
];

export default function Tracker() {
  const [list, setList] = useState<LocationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ locations?: LocationEntry[] }>('/api/location/employees')
      .then(({ data }) => setList(data.locations?.length ? data.locations : DUMMY_DATA))
      .catch(() => setList(DUMMY_DATA))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-1 md:p-4 space-y-6 flex flex-col h-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">Employee Tracking</h2>

        <div className="flex flex-wrap items-center gap-3">
          {/* Select Date Filter */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[#F3F4F6] border border-transparent rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
            <span className="text-[#616161] text-sm font-medium">Select Date</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="#616161" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11.9955 13.7H12.0045M8.29551 13.7H8.30449M8.29551 16.7H8.30449M11.9955 16.7H12.0045M15.6955 13.7H15.7045M15.6955 16.7H15.7045" stroke="#616161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center justify-between gap-8 px-4 py-2 bg-[#F3F4F6] border border-transparent rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
            <span className="text-[#616161] text-sm font-medium">Status</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.92 8.95L13.4 15.47C12.63 16.24 11.37 16.24 10.6 15.47L4.08 8.95" stroke="#616161" strokeWidth="2.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-auto custom-scrollbar flex-1" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-100 shadow-sm bg-white">
                <th className="px-6 py-5 text-center text-sm font-bold text-gray-700 bg-white">Sl.No</th>
                <th className="px-6 py-5 text-center text-sm font-bold text-gray-700 bg-white">Date</th>
                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700 bg-white">Employee Name</th>
                <th className="px-6 py-5 text-center text-sm font-bold text-gray-700 bg-white">Time In</th>
                <th className="px-6 py-5 text-center text-sm font-bold text-gray-700 bg-white">Time Out</th>
                <th className="px-6 py-5 text-center text-sm font-bold text-gray-700 bg-white">Total Hours</th>
                <th className="px-6 py-5 text-center text-sm font-bold text-gray-700 bg-white">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium bg-white">
                    No tracking data available for the selected criteria.
                  </td>
                </tr>
              ) : (
                list.map((loc, index) => {
                  const slNo = (index + 1).toString().padStart(2, '0');
                  const dateObj = loc.updated_at ? new Date(loc.updated_at) : new Date();
                  const formattedDate = dateObj.toLocaleDateString('en-GB').replace(/\//g, '/');
                  const formattedTime = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  });

                  return (
                    <tr key={loc.id} className={`${index % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                      <td className="px-6 py-4 text-center text-sm text-gray-600 font-medium">{slNo}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{formattedDate}</td>
                      <td className="px-6 py-4 text-left text-sm text-gray-900 font-semibold">{loc.full_name ?? 'N/A'}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{formattedTime}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{formattedTime}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600 font-medium">hh:mm:ss</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-4 py-1.5 rounded-lg text-xs font-bold ${index % 2 === 0 ? 'bg-[#E6F4EA] text-[#1E7E34]' : 'bg-[#FCE8E8] text-[#D93025]'}`}>
                          {index % 2 === 0 ? 'Online' : 'Offline'}
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
}


