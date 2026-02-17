import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  return (
    <header className="h-20 flex items-center px-6 bg-transparent">
      {/* Mobile Menu Button - Left */}
      <div className="lg:hidden mr-4">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-white/50"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-end gap-4 md:gap-8">
        {/* Search Bar - Centered-ish but to the right */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search"
              className="w-[182px] pl-12 pr-4 py-2 bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#3d3399]/10 focus:border-[#3d3399]/40 transition shadow-sm"
            />
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-4 md:gap-6">
          <button className="relative p-2 text-slate-600 hover:text-[#DD4342] transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#DD4342] rounded-full border-2 border-white"></span>
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-slate-800 font-semibold text-lg">
              Hello, {user?.full_name?.split(' ')[0] || 'Walker'}!
            </span>
            <div
              className="w-11 h-11 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-200 cursor-pointer hover:opacity-80 transition"
              onClick={() => navigate('/profile')}
            >
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white font-bold text-xl uppercase">
                  {(user?.full_name || 'U').charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
