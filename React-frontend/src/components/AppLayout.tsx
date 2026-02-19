import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './ProductSidebar/Sidebar';
import ProductNavbar from './ProductNavbar/Navbar';
import BgImage from '../assets/Bg.png';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${BgImage})` }}
    >
      {/* Navbar — renders itself full width */}
      <ProductNavbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex flex-1 min-h-0">
        {/* Mobile overlay */}
        <div
          className={`fixed inset-0 z-40 bg-black/40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        {/* Sidebar — renders itself */}
        <div
          className={`fixed lg:static inset-y-0 left-0 z-50 w-[185px] shrink-0 p-3 pt-0 transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
        >
          <Sidebar onMenuClick={() => setSidebarOpen(false)} />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto px-4 pb-4 min-w-0">
          <div className="mt-4 min-h-screen rounded-2xl bg-white/85 backdrop-blur-sm shadow-sm p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
