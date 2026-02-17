import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BgImage from '../assets/Bg.png';
import SwifterzLogo from '../assets/SwifterzLogo.png';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-[12px] transition-all duration-200 ${isActive
    ? 'bg-[#E14B4B] text-white shadow-lg shadow-red-200'
    : 'text-slate-600 hover:bg-slate-50 hover:text-red-500'
  }`;

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/client-login', { replace: true });
  }

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
      <div className="fixed lg:static inset-y-0 left-0 z-50 w-[280px] p-4 transform transition-transform lg:transform-none">
        <aside className="h-full bg-white flex flex-col rounded-[20px] shadow-sm border border-white/40 overflow-hidden">
          <div className="p-6 flex items-center gap-2 border-b border-slate-50">
            <img src={SwifterzLogo} alt="Swifterz" className="h-10 w-auto object-contain" />
          </div>
          <nav className="p-4 flex-1 space-y-2">
            <NavLink to="/client/dashboard" className={linkClass}>
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="font-medium">Dashboard</span>
            </NavLink>
            <NavLink to="/client/chat" className={linkClass}>
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-medium">Chat</span>
            </NavLink>
          </nav>

          <div className="p-4 border-t border-slate-50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-red-500 font-semibold hover:bg-red-50 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Log Out</span>
            </button>
          </div>
        </aside>
      </div>

      <div className="flex-1 flex flex-col min-w-0 pr-4 pb-4">
        <header className="h-20 flex items-center justify-between px-6 bg-transparent">
          <h1 className="text-xl font-bold text-slate-800">Hello, {user?.full_name?.split(' ')[0] || 'Client'}!</h1>
          <div className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-200">
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'C')}&background=3d3399&color=fff`} alt="Profile" className="w-full h-full object-cover" />
          </div>
        </header>
        <main className="flex-1 bg-white/80 backdrop-blur-sm rounded-[20px] p-6 overflow-auto shadow-sm border border-white/40">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
