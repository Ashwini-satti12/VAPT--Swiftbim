import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BgImage from '../assets/Bg.png';
import SwifterzLogo from '../assets/ProductNavbarIcons/swifterzlogo.png';
import { useAuth } from '../contexts/AuthContext';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      className="min-h-screen flex text-slate-900"
      style={{
        backgroundImage: `url(${BgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div
        className={`fixed inset-0 z-40 bg-black/40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Left Column: Logo + Sidebar + Logout */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[280px] flex flex-col transform transition-transform lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        {/* Logo Area */}
        <div className="h-20 flex items-center px-8 shrink-0">
          <img src={SwifterzLogo} alt="Swifterz" className="h-10 w-auto object-contain" />
        </div>

        {/* Sidebar Menu Box */}
        <div className="px-4 pb-4 flex-shrink-0">
          <Sidebar onMenuClick={() => setSidebarOpen(false)} />
        </div>

        {/* Logout Button - Outside Sidebar Box */}
        <div className="px-4 pb-4 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-red-500 font-semibold hover:bg-red-50 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </div>

      {/* Right Column: Topbar + Main */}
      <div className="flex-1 flex flex-col min-w-0 pr-4 pb-4">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 bg-white/80 backdrop-blur-sm rounded-[20px] p-6 shadow-sm border border-white/40">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
